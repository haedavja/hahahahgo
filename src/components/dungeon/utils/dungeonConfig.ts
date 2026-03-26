/**
 * @file dungeonConfig.js
 * @description 던전 설정 및 오브젝트 타입 정의
 * @typedef {import('../../../types').DungeonObject} DungeonObject
 * @typedef {import('../../../types').DungeonObjectType} DungeonObjectType
 *
 * @typedef {Object} ObjectTypeConfig
 * @property {string} id - 오브젝트 타입 ID
 * @property {string} label - 표시 이름
 * @property {boolean} canReuse - 재사용 가능 여부
 * @property {number} probRoom - 방에서의 등장 확률
 * @property {number} probCorridor - 복도에서의 등장 확률
 * @property {Function} render - 렌더링 함수
 */

import type { DirectionMap } from '../../../types';

// ========== 설정 ==========
export const CONFIG = {
  SEGMENT_COUNT: { min: 5, max: 9 },
  VIEWPORT: { width: 1600, height: 600 },
  PLAYER: { width: 40, height: 64, speed: 5 },
  FLOOR_Y: 500,
  ROOM_WIDTH: 1600,  // 뷰포트와 동일하게 (미로 방 크기)
  CORRIDOR_WIDTH: 3000,
  MIN_COMBAT_COUNT: 2,
  // 미로 던전 설정
  MAZE: {
    GRID_SIZE: 5,          // 5x5 그리드
    MIN_ROOMS: 12,         // 최소 방 개수
    MAX_ROOMS: 18,         // 최대 방 개수
    DEAD_END_REWARD: 0.7,  // 막다른 방에 보상 확률
    HIDDEN_ROOM_CHANCE: 0.15, // 숨겨진 방 확률
    LOOP_CHANCE: 0.3,      // 루프 생성 확률
  },
};

// ========== 오브젝트 타입 정의 ==========
export const OBJECT_TYPES = {
  CHEST: {
    id: "chest",
    label: "보물 상자",
    canReuse: false,
    probRoom: 0.35,
    probCorridor: 0.30,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      ctx.fillStyle = used ? "#555" : "#f39c12";
      ctx.fillRect(x - 25, y - 25, 50, 40);
    },
  },
  CURIO: {
    id: "curio",
    label: "수상한 상징",
    canReuse: false,
    probRoom: 0.35,
    probCorridor: 0.25,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
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
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
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
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
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
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean, unlocked: boolean) => {
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
  HIDDEN_DOOR: {
    id: "hidden_door",
    label: "숨겨진 문",
    canReuse: true,
    probRoom: 0.0,
    probCorridor: 0.0,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean, discovered: boolean) => {
      if (discovered) {
        // 발견된 숨겨진 문
        ctx.fillStyle = "#8b5cf6";
        ctx.fillRect(x - 25, y - 80, 50, 80);
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(x - 18, y - 70, 36, 70);
        ctx.fillStyle = "#c4b5fd";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("비밀 통로", x, y - 85);
      } else {
        // 발견되지 않은 상태 - 벽의 균열처럼 보임
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 60);
        ctx.lineTo(x + 2, y - 40);
        ctx.lineTo(x - 3, y - 20);
        ctx.stroke();
      }
    },
  },

  // === 자원 획득 오브젝트 ===
  ORE: {
    id: "ore",
    label: "광맥",
    canReuse: false,
    probRoom: 0.15,
    probCorridor: 0.10,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      // 바위 형태
      ctx.fillStyle = used ? "#555" : "#78716c";
      ctx.beginPath();
      ctx.moveTo(x - 30, y);
      ctx.lineTo(x - 20, y - 35);
      ctx.lineTo(x + 5, y - 40);
      ctx.lineTo(x + 25, y - 25);
      ctx.lineTo(x + 30, y);
      ctx.closePath();
      ctx.fill();
      // 반짝이는 광석
      if (!used) {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(x - 5, y - 20, 6, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 15, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  GOLD_PILE: {
    id: "gold_pile",
    label: "금화 더미",
    canReuse: false,
    probRoom: 0.12,
    probCorridor: 0.08,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      ctx.fillStyle = used ? "#555" : "#fbbf24";
      // 동전 더미
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(x - 10 + i * 5, y - 5 - i * 3, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!used) {
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("$", x, y - 25);
      }
    },
  },
  CRATE: {
    id: "crate",
    label: "나무 상자",
    canReuse: false,
    probRoom: 0.15,
    probCorridor: 0.12,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      ctx.fillStyle = used ? "#555" : "#a16207";
      ctx.fillRect(x - 20, y - 30, 40, 30);
      // 나무 무늬
      ctx.strokeStyle = used ? "#444" : "#854d0e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 20, y - 15);
      ctx.lineTo(x + 20, y - 15);
      ctx.moveTo(x, y - 30);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
  },
  CRYSTAL: {
    id: "crystal",
    label: "수정",
    canReuse: false,
    probRoom: 0.10,
    probCorridor: 0.05,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      ctx.fillStyle = used ? "#555" : "#a78bfa";
      // 수정 결정 형태
      ctx.beginPath();
      ctx.moveTo(x, y - 45);
      ctx.lineTo(x + 15, y - 15);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x - 10, y);
      ctx.lineTo(x - 15, y - 15);
      ctx.closePath();
      ctx.fill();
      if (!used) {
        ctx.fillStyle = "#c4b5fd";
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 35);
        ctx.lineTo(x + 5, y - 20);
        ctx.lineTo(x - 2, y - 20);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  MUSHROOM: {
    id: "mushroom",
    label: "버섯",
    canReuse: false,
    probRoom: 0.12,
    probCorridor: 0.10,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      // 버섯 줄기
      ctx.fillStyle = used ? "#666" : "#fef3c7";
      ctx.fillRect(x - 6, y - 20, 12, 20);
      // 버섯 갓
      ctx.fillStyle = used ? "#555" : "#dc2626";
      ctx.beginPath();
      ctx.arc(x, y - 20, 18, Math.PI, 0, false);
      ctx.fill();
      // 점무늬
      if (!used) {
        ctx.fillStyle = "#fef2f2";
        ctx.beginPath();
        ctx.arc(x - 8, y - 25, 3, 0, Math.PI * 2);
        ctx.arc(x + 6, y - 28, 2, 0, Math.PI * 2);
        ctx.arc(x + 2, y - 22, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  CORPSE: {
    id: "corpse",
    label: "시체",
    canReuse: false,
    probRoom: 0.08,
    probCorridor: 0.06,
    render: (ctx: CanvasRenderingContext2D, x: number, y: number, used: boolean) => {
      ctx.fillStyle = used ? "#444" : "#64748b";
      // 누워있는 형태
      ctx.fillRect(x - 25, y - 10, 50, 10);
      // 머리
      ctx.beginPath();
      ctx.arc(x - 20, y - 15, 8, 0, Math.PI * 2);
      ctx.fill();
      if (!used) {
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("💀", x + 15, y - 5);
      }
    },
  },
};

// ========== 미로 방향 정의 ==========
export const DIRECTIONS: DirectionMap = {
  north: { dx: 0, dy: -1, opposite: 'south' },
  south: { dx: 0, dy: 1, opposite: 'north' },
  east: { dx: 1, dy: 0, opposite: 'west' },
  west: { dx: -1, dy: 0, opposite: 'east' },
};
