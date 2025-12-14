import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import { useDungeonState } from "./hooks/useDungeonState";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { EtherBar } from "../battle/ui/EtherBar";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_RARITY_COLORS } from "../../lib/relics";
import { OBSTACLE_TEMPLATES } from "../../data/dungeonNodes";
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
  CROSSROAD: {
    id: "crossroad",
    label: "기로",
    canReuse: true,  // 기로는 선택지를 통해 처리
    probRoom: 0.0,
    probCorridor: 0.0,  // 수동으로 배치
    render: (ctx, x, y, used) => {
      // 갈림길 표시 (돌 표지판 형태)
      ctx.fillStyle = used ? "#555" : "#7f8c8d";
      // 기둥
      ctx.fillRect(x - 8, y - 60, 16, 60);
      // 왼쪽 화살표
      ctx.fillStyle = used ? "#666" : "#3498db";
      ctx.beginPath();
      ctx.moveTo(x - 35, y - 50);
      ctx.lineTo(x - 10, y - 60);
      ctx.lineTo(x - 10, y - 40);
      ctx.closePath();
      ctx.fill();
      // 오른쪽 화살표
      ctx.fillStyle = used ? "#666" : "#e74c3c";
      ctx.beginPath();
      ctx.moveTo(x + 35, y - 50);
      ctx.lineTo(x + 10, y - 60);
      ctx.lineTo(x + 10, y - 40);
      ctx.closePath();
      ctx.fill();
      // 물음표
      ctx.fillStyle = used ? "#888" : "#f1c40f";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("?", x, y - 70);
    },
  },
  SHORTCUT: {
    id: "shortcut",
    label: "숏컷 문",
    canReuse: true,
    probRoom: 0.0,
    probCorridor: 0.0,  // 수동으로 배치
    render: (ctx, x, y, used, unlocked) => {
      // 숏컷 문 (아치형)
      ctx.fillStyle = unlocked ? "#22c55e" : "#475569";
      // 문틀
      ctx.fillRect(x - 25, y - 80, 50, 80);
      // 문 안쪽 (열리면 통로가 보임)
      ctx.fillStyle = unlocked ? "#0f172a" : "#1e293b";
      ctx.fillRect(x - 18, y - 70, 36, 70);
      // 아치
      ctx.fillStyle = unlocked ? "#22c55e" : "#475569";
      ctx.beginPath();
      ctx.arc(x, y - 70, 18, Math.PI, 0, false);
      ctx.fill();
      // 손잡이 또는 자물쇠
      ctx.fillStyle = unlocked ? "#fbbf24" : "#ef4444";
      ctx.beginPath();
      ctx.arc(x + 10, y - 35, 4, 0, Math.PI * 2);
      ctx.fill();
      // 라벨
      ctx.fillStyle = unlocked ? "#22c55e" : "#94a3b8";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(unlocked ? "숏컷" : "🔒", x, y - 85);
    },
  },
};

// ========== 기로 템플릿 선택 ==========
function getRandomCrossroadTemplate(forcedTemplateId = null) {
  // 강제 템플릿이 지정된 경우
  if (forcedTemplateId && OBSTACLE_TEMPLATES[forcedTemplateId]) {
    console.log('[Dungeon] 강제 기로 템플릿 사용:', forcedTemplateId);
    return { ...OBSTACLE_TEMPLATES[forcedTemplateId] };
  }
  const templates = Object.keys(OBSTACLE_TEMPLATES);
  const key = templates[Math.floor(Math.random() * templates.length)];
  return { ...OBSTACLE_TEMPLATES[key] };
}

// ========== 던전 생성 ==========
function generateDungeon(forcedCrossroadId = null) {
  const count = CONFIG.SEGMENT_COUNT.min +
    Math.floor(Math.random() * (CONFIG.SEGMENT_COUNT.max - CONFIG.SEGMENT_COUNT.min + 1));

  const segments = [];

  // 기로 배치할 세그먼트 인덱스 (복도 중 1-2개)
  const corridorIndices = [];
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0 && i < count - 1) {  // 복도 세그먼트 (첫 번째 포함)
      corridorIndices.push(i);
    }
  }
  // 첫 번째 세그먼트(0)에 항상 기로 배치 + 추가로 랜덤 1개
  const crossroadSegments = new Set([0]);  // 던전 입구에서 바로 기로
  const remainingCorridors = corridorIndices.filter(i => i !== 0);
  if (remainingCorridors.length > 0 && Math.random() < 0.5) {
    const idx = Math.floor(Math.random() * remainingCorridors.length);
    crossroadSegments.add(remainingCorridors[idx]);
  }

  // 숏컷 배치할 세그먼트 (후반부 방에 숏컷 문 배치, 초반으로 연결)
  const shortcutPairs = [];
  if (count >= 5) {
    // 세그먼트 4 또는 6 (방)에서 세그먼트 1 (방)로 연결
    const fromIdx = count >= 7 ? 5 : 3;  // 방 세그먼트 (홀수 인덱스)
    const toIdx = 1;  // 첫 번째 방
    if (fromIdx < count) {
      shortcutPairs.push({ from: fromIdx, to: toIdx });
    }
  }

  console.log('[Dungeon] 생성 - 세그먼트 수:', count, '기로 위치:', [...crossroadSegments], '숏컷:', shortcutPairs);

  for (let i = 0; i < count; i++) {
    const isRoom = i % 2 === 1;
    const width = isRoom ? CONFIG.ROOM_WIDTH : CONFIG.CORRIDOR_WIDTH;

    // 오브젝트 생성
    const objects = createObjects(isRoom, i);

    // 기로 추가 (복도 세그먼트에)
    if (crossroadSegments.has(i)) {
      const template = getRandomCrossroadTemplate(forcedCrossroadId);
      console.log('[Dungeon] 기로 추가 - 세그먼트:', i, '템플릿:', template.name);
      objects.push({
        id: `crossroad_${i}`,
        typeId: "crossroad",
        x: i === 0 ? 300 : 600,  // 첫 세그먼트는 더 가깝게 배치
        used: false,
        template: template,  // 기로 템플릿 데이터
        choiceState: {},     // 선택지 상태 (시도 횟수 등)
      });
    }

    // 숏컷 문 추가
    const shortcutFrom = shortcutPairs.find(p => p.from === i);
    const shortcutTo = shortcutPairs.find(p => p.to === i);

    if (shortcutFrom) {
      // 이 세그먼트에서 출발하는 숏컷 (처음엔 잠김, 여기서 열 수 있음)
      objects.push({
        id: `shortcut_from_${i}`,
        typeId: "shortcut",
        x: isRoom ? 800 : 1500,
        used: false,
        unlocked: false,
        targetSegment: shortcutFrom.to,
        isOrigin: true,  // 이 문에서 열 수 있음
      });
    }

    if (shortcutTo) {
      // 이 세그먼트로 도착하는 숏컷 (연결된 문)
      objects.push({
        id: `shortcut_to_${i}`,
        typeId: "shortcut",
        x: isRoom ? 200 : 400,
        used: false,
        unlocked: false,
        targetSegment: shortcutTo.from,
        isOrigin: false,  // 반대편에서 열어야 함
        linkedShortcutId: `shortcut_from_${shortcutTo.from}`,
      });
    }

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
    context.actions.setMessage(`보물 상자를 열었습니다. 에테르 ${ether}`);
  },

  curio: (obj, context) => {
    obj.used = true;
    const isBad = Math.random() < 0.5;
    const ether = isBad
      ? (3 + Math.floor(Math.random() * 4))
      : -(2 + Math.floor(Math.random() * 3));

    context.applyEtherDelta(ether);
    context.actions.setMessage(
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

  // 기로 핸들러 - 선택지 모달 열기
  crossroad: (obj, context) => {
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
  const relics = useGameStore((s) => s.relics);
  const resources = useGameStore((s) => s.resources);
  const playerHp = useGameStore((s) => s.playerHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const devForcedCrossroad = useGameStore((s) => s.devForcedCrossroad);

  // 던전 데이터 생성 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonData) {
      const newDungeon = generateDungeon(devForcedCrossroad);
      setDungeonData(newDungeon);
    }
  }, [activeDungeon, setDungeonData, devForcedCrossroad]);

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
  const dungeonData = activeDungeon?.dungeonData || [];
  // activeDungeon에서 위치 정보 가져오기 (재마운트 시에도 유지)
  // Dungeon 상태 (useReducer 기반)
  const { dungeon, actions } = useDungeonState({
    segmentIndex: activeDungeon?.segmentIndex || 0,
    playerX: activeDungeon?.playerX || 100,
  });

  // Destructure dungeon state
  const segmentIndex = dungeon.segmentIndex;
  const playerX = dungeon.playerX;
  const cameraX = dungeon.cameraX;
  const keys = dungeon.keys;
  const message = dungeon.message;
  const rewardModal = dungeon.rewardModal;
  const showCharacter = dungeon.showCharacter;
  const dungeonSummary = dungeon.dungeonSummary;
  const hoveredRelic = dungeon.hoveredRelic;
  const crossroadModal = dungeon.crossroadModal;
  const screenShake = dungeon.screenShake;

  // 플레이어 스탯 가져오기 (기로 선택지 요구조건 체크용)
  const playerStrength = useGameStore((s) => s.playerStrength) || 0;
  const playerAgility = useGameStore((s) => s.playerAgility) || 0;
  const playerInsight = useGameStore((s) => s.playerInsight) || 0;


  // 던전 중 획득한 자원 델타 (x값) - activeDungeon에서 가져옴 (재마운트 시에도 유지)
  const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };

  // 초기 자원은 activeDungeon에서 가져옴 (재마운트 시에도 유지) - z값
  const initialResources = activeDungeon?.initialResources || resources;

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const preBattleState = useRef(null); // 전투 전 상태 저장
  const interactionRef = useRef(null); // 상호작용 함수 ref
  const playerXRef = useRef(playerX); // 플레이어 X 위치 ref (이동 루프용)

  const segment = dungeonData[segmentIndex];
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
  }, [actions, showCharacter]);

  // playerX ref 동기화
  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  // ========== 플레이어 이동 ==========
  useEffect(() => {
    if (!segment) return;

    const moveLoop = () => {
      let newX = playerXRef.current;
      if (keys.a) {
        newX = Math.max(50, newX - CONFIG.PLAYER.speed);
      }
      if (keys.d) {
        newX = Math.min(segment.width - 50, newX + CONFIG.PLAYER.speed);
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

  // ========== 카메라 ==========
  useEffect(() => {
    if (!segment) return;
    const target = playerX - CONFIG.VIEWPORT.width / 2;
    const maxCamera = segment.width - CONFIG.VIEWPORT.width;
    actions.setCameraX(Math.max(0, Math.min(maxCamera, target)));
  }, [playerX, segment]);

  // ========== 전투 결과 처리 ==========
  useEffect(() => {
    if (!lastBattleResult || !lastBattleResult.nodeId.startsWith("dungeon-")) return;

    if (lastBattleResult.result === "victory") {
      const gold = 5 + Math.floor(Math.random() * 6);
      const loot = Math.random() < 0.5 ? 1 : 0;
      actions.setRewardModal({ gold, loot, victory: true });
    } else {
      actions.setRewardModal({ gold: 0, loot: 0, victory: false });
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
      // 숏컷의 경우 unlocked 상태 전달
      if (obj.typeId === 'shortcut') {
        objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used, obj.unlocked);
      } else {
        objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used);
      }
      ctx.restore();
    });

    // 입구 (이전 세그먼트로 돌아가기) - 첫 세그먼트가 아닌 경우
    if (segmentIndex > 0) {
      const entranceX = 30;
      const entranceScreenX = entranceX - cameraX;
      if (entranceScreenX > -100 && entranceScreenX < CONFIG.VIEWPORT.width + 100) {
        ctx.fillStyle = "#8b5cf6";  // 보라색
        ctx.fillRect(entranceScreenX - 20, CONFIG.FLOOR_Y - 90, 40, 90);
        ctx.fillStyle = "#fff";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("◀ 뒤로", entranceScreenX, CONFIG.FLOOR_Y - 100);
      }
    }

    // 출구
    const exitScreenX = segment.exitX - cameraX;
    if (exitScreenX > -100 && exitScreenX < CONFIG.VIEWPORT.width + 100) {
      ctx.fillStyle = segment.isLast ? "#27ae60" : "#3498db";
      ctx.fillRect(exitScreenX - 20, CONFIG.FLOOR_Y - 90, 40, 90);
      ctx.fillStyle = "#fff";
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(segment.isLast ? "출구" : "다음 ▶", exitScreenX, CONFIG.FLOOR_Y - 100);
    }

    // 미니맵 렌더링 (오른쪽 상단)
    const minimapX = CONFIG.VIEWPORT.width - 180;
    const minimapY = 20;
    const minimapW = 160;
    const minimapH = 40;
    const segmentW = minimapW / dungeonData.length;

    // 미니맵 배경
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(minimapX - 5, minimapY - 5, minimapW + 10, minimapH + 25);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.strokeRect(minimapX - 5, minimapY - 5, minimapW + 10, minimapH + 25);

    // 미니맵 타이틀
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.fillText("던전 지도", minimapX, minimapY + minimapH + 15);

    // 숏컷 연결선 먼저 그리기
    dungeonData.forEach((seg, idx) => {
      const shortcut = seg.objects.find(o => o.typeId === 'shortcut' && o.isOrigin);
      if (shortcut && shortcut.unlocked) {
        const fromX = minimapX + idx * segmentW + segmentW / 2;
        const toX = minimapX + shortcut.targetSegment * segmentW + segmentW / 2;
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(fromX, minimapY - 3);
        ctx.bezierCurveTo(fromX, minimapY - 15, toX, minimapY - 15, toX, minimapY - 3);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // 세그먼트 표시
    dungeonData.forEach((seg, idx) => {
      const x = minimapX + idx * segmentW;
      const visited = idx <= segmentIndex;

      // 세그먼트 배경
      ctx.fillStyle = visited ? (seg.isRoom ? "#3b82f6" : "#475569") : "#1e293b";
      ctx.fillRect(x + 1, minimapY, segmentW - 2, minimapH);

      // 숏컷 표시 (세그먼트 상단에 작은 점)
      const hasShortcut = seg.objects.some(o => o.typeId === 'shortcut');
      if (hasShortcut) {
        const shortcut = seg.objects.find(o => o.typeId === 'shortcut');
        ctx.fillStyle = shortcut?.unlocked ? "#22c55e" : "#ef4444";
        ctx.beginPath();
        ctx.arc(x + segmentW / 2, minimapY - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 현재 위치 표시
      if (idx === segmentIndex) {
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(x + segmentW / 2, minimapY + minimapH / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 출구 표시
      if (seg.isLast) {
        ctx.fillStyle = visited ? "#fbbf24" : "#64748b";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("★", x + segmentW / 2, minimapY + minimapH / 2 + 4);
      }
    });

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
    const etherCurrentPts = getCurrentSlotPts(etherPts);
    const etherNextSlotCost = getNextSlotCost(etherPts);
    const etherW = 60;
    const etherH = 8;
    const etherY = playerY - 20;

    ctx.fillStyle = "#333";
    ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW, etherH);

    ctx.fillStyle = "#53d7ff";
    ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW * etherProgress, etherH);

    // 에테르 텍스트 (전투/맵과 동일하게 표시)
    ctx.fillStyle = "#53d7ff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${etherCurrentPts}/${etherNextSlotCost}`, playerScreenX - 20, etherY - 5);
    ctx.fillText(`x${etherSlots}`, playerScreenX + 20, etherY - 5);

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
  const handleInteraction = useCallback(() => {
    if (!segment) return;

    // 입구 체크 (이전 세그먼트로 돌아가기)
    if (segmentIndex > 0 && playerX < 80) {
      const prevSegment = dungeonData[segmentIndex - 1];
      actions.setSegmentIndex(segmentIndex - 1);
      // 이전 세그먼트의 출구 근처로 이동
      actions.setPlayerX(prevSegment.exitX - 100);
      actions.setMessage("이전 구역으로 돌아왔습니다.");
      return;
    }

    // 오브젝트 체크
    for (const obj of segment.objects) {
      if (Math.abs(playerX - obj.x) < 80) {
        const objType = OBJECT_TYPES[obj.typeId.toUpperCase()];

        if (obj.used && !objType.canReuse) {
          actions.setMessage("이미 사용했습니다.");
          return;
        }

        const handler = OBJECT_HANDLERS[obj.typeId];
        if (handler) {
          handler(obj, {
            applyEtherDelta,
            actions,
            startBattle,
            segmentIndex,
            preBattleState,
            playerX,
            dungeonData,
            setDungeonData,
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
        actions.setSegmentIndex(segmentIndex + 1);
        actions.setPlayerX(100);
        actions.setMessage("");
      }
    }
  }, [segment, playerX, actions, applyEtherDelta, startBattle, segmentIndex, dungeonData, setDungeonData]);

  // handleInteraction ref 업데이트
  useEffect(() => {
    interactionRef.current = handleInteraction;
  }, [handleInteraction]);

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
      actions.setSegmentIndex(preBattleState.current.segmentIndex);
      actions.setPlayerX(preBattleState.current.playerX);
      preBattleState.current = null;
    }

    actions.setRewardModal(null);
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
    actions.setDungeonSummary(summary);
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
    actions.setDungeonSummary(summary);
  };

  const closeDungeonSummary = () => {
    const isComplete = dungeonSummary?.isComplete;

    // 던전 종료 시 z값 + x값을 실제 resources에 반영
    addResources(dungeonDeltas);

    actions.setDungeonSummary(null);
    if (isComplete) {
      completeDungeon();
    } else {
      skipDungeon();
    }
  };

  // ========== 기로 선택지 처리 ==========

  // 스탯 요구조건 충족 여부 확인
  const checkRequirement = useCallback((choice, attemptCount = 0) => {
    const req = choice.requirements || {};
    const scaling = choice.scalingRequirement;

    // 기본 요구조건 체크
    if (req.strength && playerStrength < req.strength) return false;
    if (req.agility && playerAgility < req.agility) return false;
    if (req.insight && playerInsight < req.insight) return false;

    // 스케일링 요구조건 체크 (시도 횟수에 따라 증가)
    if (scaling) {
      const requiredValue = scaling.baseValue + (scaling.increment * attemptCount);
      const statValue = scaling.stat === 'strength' ? playerStrength :
                        scaling.stat === 'agility' ? playerAgility :
                        scaling.stat === 'insight' ? playerInsight : 0;
      if (statValue < requiredValue) return false;
    }

    return true;
  }, [playerStrength, playerAgility, playerInsight]);

  // 선택지 실행
  const executeChoice = useCallback((choice, choiceState) => {
    if (!crossroadModal) return;

    const { obj } = crossroadModal;
    const attemptCount = choiceState[choice.id]?.attempts || 0;

    // 반복 선택 가능한 선택지인 경우
    if (choice.repeatable) {
      const newAttempts = attemptCount + 1;
      const maxAttempts = choice.maxAttempts || 5;

      // 스케일링 요구조건 체크 (현재 시도에 대한 스탯 충족 여부)
      const hasScalingReq = !!choice.scalingRequirement;
      const meetsRequirement = hasScalingReq ? checkRequirement(choice, newAttempts) : true;

      // 화면 흔들림 효과
      if (choice.screenEffect === 'shake') {
        actions.setScreenShake(true);
        setTimeout(() => actions.setScreenShake(false), 200);
      }

      // 스탯 미달 시 즉시 실패
      if (hasScalingReq && !meetsRequirement) {
        const outcome = choice.outcomes.failure;
        applyChoiceOutcome(outcome, obj);
        actions.setMessage(outcome.text);

        // 기로 완료 처리
        obj.used = true;
        actions.setCrossroadModal(null);

        // 일정 시간 후 메시지 클리어
        setTimeout(() => actions.setMessage(''), 3000);
        return;
      }

      // 경고 체크
      if (choice.warningAtAttempt && newAttempts === choice.warningAtAttempt) {
        actions.setMessage(choice.warningText || '뭔가 이상한 기운이...');
      }

      // 최대 시도 횟수 도달 시 (스케일링 없거나, 스케일링 있으면서 요구조건 충족)
      if (newAttempts >= maxAttempts) {
        // 스케일링 없는 경우: 확률적 성공/실패
        // 스케일링 있는 경우: 여기까지 왔으면 매번 충족했으므로 성공
        const isSuccess = hasScalingReq ? true : (Math.random() < (choice.successRate ?? 0.5));
        const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;

        // 결과 적용
        applyChoiceOutcome(outcome, obj);
        actions.setMessage(outcome.text);

        // 기로 완료 처리
        obj.used = true;
        actions.setCrossroadModal(null);

        // 일정 시간 후 메시지 클리어
        setTimeout(() => actions.setMessage(''), 3000);
      } else {
        // 진행 중 - 진행 텍스트 표시
        const progressIdx = Math.min(newAttempts - 1, (choice.progressText?.length || 1) - 1);
        const progressMsg = choice.progressText?.[progressIdx] || `시도 ${newAttempts}/${maxAttempts}`;
        actions.setMessage(progressMsg);

        // 선택지 상태 업데이트
        const newChoiceState = {
          ...choiceState,
          [choice.id]: { attempts: newAttempts },
        };
        obj.choiceState = newChoiceState;
        actions.setCrossroadModal({
          ...crossroadModal,
          choiceState: newChoiceState,
        });
      }
    } else {
      // 일회성 선택지
      // successRate가 있으면 확률 판정, 없으면 항상 성공
      const hasSuccessRate = choice.successRate !== undefined;
      const isSuccess = hasSuccessRate ? (Math.random() < choice.successRate) : true;
      const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;

      applyChoiceOutcome(outcome, obj);
      actions.setMessage(outcome.text);

      // 기로 완료 처리
      obj.used = true;
      actions.setCrossroadModal(null);

      // 일정 시간 후 메시지 클리어
      setTimeout(() => actions.setMessage(''), 3000);
    }
  }, [crossroadModal, checkRequirement, actions]);

  // 선택지 결과 적용
  const applyChoiceOutcome = useCallback((outcome, obj) => {
    if (!outcome?.effect) return;

    const effect = outcome.effect;

    // 피해 적용
    if (effect.damage) {
      // playerHp 감소 (gameStore에서 처리)
      const currentHp = useGameStore.getState().playerHp || 50;
      useGameStore.setState({ playerHp: Math.max(0, currentHp - effect.damage) });
    }

    // 보상 적용
    if (effect.reward) {
      const newDeltas = { ...dungeonDeltas };
      if (effect.reward.gold) {
        const gold = typeof effect.reward.gold === 'object'
          ? effect.reward.gold.min + Math.floor(Math.random() * (effect.reward.gold.max - effect.reward.gold.min + 1))
          : effect.reward.gold;
        newDeltas.gold += gold;
      }
      if (effect.reward.loot) {
        newDeltas.loot += effect.reward.loot;
      }
      setDungeonDeltas(newDeltas);
    }

    // 전투 트리거
    if (effect.triggerCombat) {
      const enemyHp = effect.triggerCombat === 'mimic' ? 40 : 25;
      preBattleState.current = {
        segmentIndex,
        playerX: obj.x,
      };
      startBattle({
        nodeId: `dungeon-crossroad-${segmentIndex}`,
        kind: "combat",
        label: effect.triggerCombat === 'mimic' ? "미믹" : "습격",
        enemyHp,
        rewards: {},
      });
    }
  }, [dungeonDeltas, setDungeonDeltas, segmentIndex, startBattle]);

  // 기로 모달 닫기
  const closeCrossroadModal = useCallback(() => {
    actions.setCrossroadModal(null);
  }, [actions]);

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

      {/* 유물 표시 */}
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
            {relics.map((relicId, index) => {
              const relic = RELICS[relicId];
              if (!relic) return null;

              const isHovered = hoveredRelic === relicId;
              const rarityText = {
                [RELIC_RARITIES.COMMON]: '일반',
                [RELIC_RARITIES.RARE]: '희귀',
                [RELIC_RARITIES.SPECIAL]: '특별',
                [RELIC_RARITIES.LEGENDARY]: '전설'
              }[relic.rarity] || '알 수 없음';

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

                  {/* 개별 툴팁 */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '8px',
                      background: 'rgba(15, 23, 42, 0.98)',
                      border: `2px solid ${RELIC_RARITY_COLORS[relic.rarity]}`,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      minWidth: '220px',
                      boxShadow: `0 4px 20px ${RELIC_RARITY_COLORS[relic.rarity]}66`,
                      zIndex: 1000,
                      pointerEvents: 'none'
                    }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: RELIC_RARITY_COLORS[relic.rarity], marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.3rem' }}>{relic.emoji}</span>
                        {relic.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: RELIC_RARITY_COLORS[relic.rarity], opacity: 0.8, marginBottom: '8px' }}>
                        {rarityText}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                        {relic.description}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <div>던전 {segmentIndex + 1}/{dungeonData.length}</div>
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

      {/* 기로 선택지 모달 */}
      {crossroadModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          animation: screenShake ? "shake 0.2s ease-in-out" : undefined,
        }}>
          <div style={{
            background: "linear-gradient(145deg, #1e293b, #0f172a)",
            padding: "32px",
            borderRadius: "16px",
            border: "2px solid #475569",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            maxWidth: "500px",
            width: "90%",
          }}>
            {/* 제목 */}
            <h3 style={{
              margin: "0 0 8px",
              fontSize: "24px",
              color: "#f1c40f",
              textAlign: "center",
            }}>
              {crossroadModal.template?.name || "기로"}
            </h3>

            {/* 설명 */}
            <p style={{
              margin: "0 0 24px",
              fontSize: "15px",
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.6,
            }}>
              {crossroadModal.template?.description || "선택의 순간입니다."}
            </p>

            {/* 선택지 목록 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {crossroadModal.template?.choices?.map((choice) => {
                const attemptCount = crossroadModal.choiceState[choice.id]?.attempts || 0;
                const canSelect = choice.repeatable || attemptCount === 0;

                return (
                  <button
                    key={choice.id}
                    onClick={() => canSelect && executeChoice(choice, crossroadModal.choiceState)}
                    disabled={!canSelect}
                    style={{
                      padding: "16px 20px",
                      background: canSelect
                        ? "rgba(59, 130, 246, 0.15)"
                        : "rgba(100, 116, 139, 0.1)",
                      border: `2px solid ${canSelect ? "#3b82f6" : "#475569"}`,
                      borderRadius: "10px",
                      color: canSelect ? "#e2e8f0" : "#64748b",
                      fontSize: "15px",
                      cursor: canSelect ? "pointer" : "not-allowed",
                      textAlign: "left",
                      transition: "all 0.2s",
                      opacity: canSelect ? 1 : 0.5,
                    }}
                  >
                    <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                      {choice.text}
                    </div>
                    {choice.repeatable && attemptCount > 0 && (
                      <div style={{
                        fontSize: "12px",
                        color: "#94a3b8",
                        marginTop: "4px",
                      }}>
                        시도: {attemptCount}/{choice.maxAttempts || 5}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={closeCrossroadModal}
              style={{
                marginTop: "20px",
                width: "100%",
                padding: "12px",
                background: "#334155",
                border: "none",
                borderRadius: "8px",
                color: "#94a3b8",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              물러나기
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
          onClick={() => actions.setShowCharacter(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CharacterSheet onClose={() => actions.setShowCharacter(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
