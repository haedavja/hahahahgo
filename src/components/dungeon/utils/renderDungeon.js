/**
 * renderDungeon.js
 *
 * 던전 Canvas 렌더링 로직
 * DungeonExploration.jsx에서 분리됨
 */

import { CONFIG, OBJECT_TYPES } from './dungeonConfig';
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from '../../../lib/etherUtils';

/**
 * 배경 및 바닥 렌더링
 */
function renderBackground(ctx, segment) {
  const bgColors = {
    entrance: "#1a2a1a",
    exit: "#2a1a2a",
    hidden: "#2a2a1a",
    normal: "#16213e",
  };
  ctx.fillStyle = bgColors[segment.roomType] || bgColors.normal;
  ctx.fillRect(0, 0, CONFIG.VIEWPORT.width, CONFIG.VIEWPORT.height);

  // 벽 텍스처 (상단)
  ctx.fillStyle = "#0a1628";
  ctx.fillRect(0, 0, CONFIG.VIEWPORT.width, 100);

  // 바닥
  ctx.fillStyle = "#0f3460";
  ctx.fillRect(0, CONFIG.FLOOR_Y, CONFIG.VIEWPORT.width, 100);
}

/**
 * 방 유형 라벨 렌더링
 */
function renderRoomLabel(ctx, segment) {
  const roomLabels = {
    entrance: "입구",
    exit: "출구",
    hidden: "비밀의 방",
    normal: "",
  };

  if (segment.roomType !== 'normal') {
    ctx.fillStyle = segment.roomType === 'exit' ? "#22c55e" : "#fbbf24";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText(roomLabels[segment.roomType] || "", CONFIG.VIEWPORT.width / 2, 60);
  }

  if (segment.isDeadEnd) {
    ctx.fillStyle = "#ef4444";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("막다른 방", CONFIG.VIEWPORT.width / 2, 85);
  }
}

/**
 * 단일 문 렌더링
 */
function renderDoor(ctx, dir, pos, exit, grid, segment) {
  if (!exit) {
    // 문 없음 - 벽 표시
    ctx.fillStyle = "#1e293b";
    if (dir !== 'north' && dir !== 'south') {
      const wallX = dir === 'west' ? 0 : CONFIG.VIEWPORT.width - 80;
      ctx.fillRect(wallX, 100, 80, CONFIG.FLOOR_Y - 100);
    }
    return;
  }

  const isHidden = exit.type === 'hidden';
  const targetRoom = grid[exit.targetKey];
  const isDiscovered = !isHidden || (targetRoom && targetRoom.discovered);
  const isVisited = targetRoom && targetRoom.visited;

  // 문 색상 결정
  let doorColor;
  if (isHidden) {
    doorColor = isDiscovered ? "#8b5cf6" : "#4b5563";
  } else if (isVisited) {
    doorColor = "#f59e0b";
  } else if (segment.roomType === 'exit' && dir === 'north') {
    doorColor = "#22c55e";
  } else {
    doorColor = "#3b82f6";
  }

  const arrows = {
    north: isVisited ? "↩" : "▲",
    south: isVisited ? "↩" : "▼",
    west: isVisited ? "↩" : "◀",
    east: isVisited ? "↩" : "▶",
  };

  const glowSize = 20;
  ctx.save();

  if (dir === 'north') {
    renderNorthDoor(ctx, pos, doorColor, isHidden, isDiscovered, arrows[dir], glowSize);
  } else if (dir === 'south') {
    renderSouthDoor(ctx, pos, doorColor, isHidden, isDiscovered, arrows[dir], glowSize);
  } else {
    renderSideDoor(ctx, dir, pos, doorColor, isHidden, isDiscovered, arrows[dir], glowSize);
  }

  ctx.restore();

  // 문 라벨
  const labelText = isHidden && !isDiscovered
    ? "???"
    : (isVisited ? `${pos.label} ↩` : pos.label);
  ctx.fillStyle = isHidden && !isDiscovered ? "#64748b" : (isVisited ? "#fbbf24" : "#ffffff");
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 4;

  if (dir === 'north') {
    ctx.fillText(labelText, pos.x, pos.y - 10);
  } else if (dir === 'south') {
    ctx.fillText(labelText, pos.x, pos.y + 100);
  } else if (dir === 'west') {
    ctx.fillText(labelText, 50, pos.y + 90);
  } else {
    ctx.fillText(labelText, CONFIG.VIEWPORT.width - 50, pos.y + 90);
  }
  ctx.shadowBlur = 0;
}

function renderNorthDoor(ctx, pos, doorColor, isHidden, isDiscovered, arrow, glowSize) {
  const doorW = 120, doorH = 70;

  const gradient = ctx.createRadialGradient(pos.x, pos.y + doorH/2, 0, pos.x, pos.y + doorH/2, doorW);
  gradient.addColorStop(0, doorColor + "80");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x - doorW, pos.y - glowSize, doorW * 2, doorH + glowSize * 2);

  ctx.strokeStyle = doorColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(pos.x - doorW/2, pos.y, doorW, doorH);

  ctx.fillStyle = doorColor;
  ctx.fillRect(pos.x - doorW/2, pos.y, doorW, doorH);

  ctx.fillStyle = isHidden && !isDiscovered ? "#374151" : "#0f172a";
  ctx.fillRect(pos.x - doorW/2 + 10, pos.y + 8, doorW - 20, doorH - 8);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(arrow, pos.x, pos.y + doorH/2 + 10);
}

function renderSouthDoor(ctx, pos, doorColor, isHidden, isDiscovered, arrow, glowSize) {
  const doorW = 120, doorH = 80;

  const gradient = ctx.createRadialGradient(pos.x, pos.y + doorH/2, 0, pos.x, pos.y + doorH/2, doorW);
  gradient.addColorStop(0, doorColor + "80");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x - doorW, pos.y - glowSize, doorW * 2, doorH + glowSize * 2);

  ctx.strokeStyle = doorColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(pos.x - doorW/2, pos.y, doorW, doorH);

  ctx.fillStyle = doorColor;
  ctx.fillRect(pos.x - doorW/2, pos.y, doorW, doorH);

  ctx.fillStyle = isHidden && !isDiscovered ? "#374151" : "#0f172a";
  ctx.fillRect(pos.x - doorW/2 + 10, pos.y + 8, doorW - 20, doorH - 16);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(arrow, pos.x, pos.y + doorH/2 + 10);
}

function renderSideDoor(ctx, dir, pos, doorColor, isHidden, isDiscovered, arrow, glowSize) {
  const doorW = 80, doorH = 140;
  const doorX = dir === 'west' ? 0 : CONFIG.VIEWPORT.width - doorW;

  const gradient = ctx.createRadialGradient(doorX + doorW/2, pos.y, 0, doorX + doorW/2, pos.y, doorH);
  gradient.addColorStop(0, doorColor + "80");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(doorX - glowSize, pos.y - doorH/2 - glowSize, doorW + glowSize * 2, doorH + glowSize * 2);

  ctx.strokeStyle = doorColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(doorX, pos.y - doorH/2, doorW, doorH);

  ctx.fillStyle = doorColor;
  ctx.fillRect(doorX, pos.y - doorH/2, doorW, doorH);

  ctx.fillStyle = isHidden && !isDiscovered ? "#374151" : "#0f172a";
  if (dir === 'west') {
    ctx.fillRect(doorX + 8, pos.y - doorH/2 + 10, doorW - 16, doorH - 20);
  } else {
    ctx.fillRect(doorX + 8, pos.y - doorH/2 + 10, doorW - 16, doorH - 20);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.fillText(arrow, doorX + doorW/2, pos.y + 10);
}

/**
 * 4방향 문 렌더링
 */
function renderDoors(ctx, segment, grid) {
  const doorPositions = {
    north: { x: CONFIG.VIEWPORT.width / 2 + 200, y: 100, label: "북쪽" },
    south: { x: CONFIG.VIEWPORT.width / 2 - 200, y: CONFIG.FLOOR_Y - 50, label: "남쪽" },
    west: { x: 80, y: CONFIG.FLOOR_Y / 2 + 80, label: "서쪽" },
    east: { x: CONFIG.VIEWPORT.width - 80, y: CONFIG.FLOOR_Y / 2 + 80, label: "동쪽" },
  };

  Object.entries(doorPositions).forEach(([dir, pos]) => {
    const exit = segment.exits[dir];
    renderDoor(ctx, dir, pos, exit, grid, segment);
  });
}

/**
 * 오브젝트 렌더링
 */
function renderObjects(ctx, segment, cameraX) {
  (segment.objects || []).forEach((obj) => {
    const screenX = obj.x - cameraX;
    if (screenX < -100 || screenX > CONFIG.VIEWPORT.width + 100) return;

    const objType = OBJECT_TYPES[obj.typeId.toUpperCase()];
    if (!objType) return;

    ctx.save();
    ctx.globalAlpha = obj.used && !objType.canReuse ? 0.3 : 1.0;

    if (obj.isSpecial && !obj.used) {
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 15;
    }

    if (obj.typeId === 'shortcut') {
      objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used, obj.unlocked);
    } else if (obj.typeId === 'hidden_door') {
      objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used, obj.discovered);
    } else {
      objType.render(ctx, screenX, CONFIG.FLOOR_Y, obj.used);
    }
    ctx.restore();
  });
}

/**
 * 미니맵 렌더링
 */
function renderMinimap(ctx, grid, currentRoomKey, mazeData) {
  const gridSize = mazeData?.gridSize || CONFIG.MAZE.GRID_SIZE;
  const cellSize = 24;
  const minimapPadding = 15;
  const minimapW = gridSize * cellSize + minimapPadding * 2;
  const minimapH = gridSize * cellSize + minimapPadding * 2;
  const minimapX = 10;
  const minimapY = 110;

  // 미니맵 배경
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.fillRect(minimapX - 5, minimapY - 25, minimapW + 10, minimapH + 35);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  ctx.strokeRect(minimapX - 5, minimapY - 25, minimapW + 10, minimapH + 35);

  // 미니맵 타이틀
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("미로 지도", minimapX + minimapW / 2, minimapY - 8);

  // 연결선 먼저 그리기
  Object.entries(grid).forEach(([key, room]) => {
    if (!room.visited && !room.discovered) return;

    const cellX = minimapX + minimapPadding + room.x * cellSize;
    const cellY = minimapY + minimapPadding + room.y * cellSize;
    const centerX = cellX + cellSize / 2;
    const centerY = cellY + cellSize / 2;

    Object.entries(room.exits).forEach(([dir, exit]) => {
      if (!exit) return;

      const targetRoom = grid[exit.targetKey];
      if (!targetRoom) return;
      if (!targetRoom.visited && !targetRoom.discovered) return;

      const isHidden = exit.type === 'hidden';
      ctx.strokeStyle = isHidden ? "#8b5cf6" : "#475569";
      ctx.lineWidth = isHidden ? 1 : 2;
      ctx.setLineDash(isHidden ? [2, 2] : []);

      let endX = centerX;
      let endY = centerY;

      switch (dir) {
        case 'north': endY -= cellSize / 2; break;
        case 'south': endY += cellSize / 2; break;
        case 'west': endX -= cellSize / 2; break;
        case 'east': endX += cellSize / 2; break;
      }

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  });

  // 방 그리기
  Object.entries(grid).forEach(([key, room]) => {
    const cellX = minimapX + minimapPadding + room.x * cellSize;
    const cellY = minimapY + minimapPadding + room.y * cellSize;

    if (!room.visited && !room.discovered) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);
      return;
    }

    let roomColor = "#475569";
    if (room.visited) {
      switch (room.roomType) {
        case 'entrance': roomColor = "#22c55e"; break;
        case 'exit': roomColor = "#fbbf24"; break;
        case 'hidden': roomColor = "#8b5cf6"; break;
        default: roomColor = room.isDeadEnd ? "#ef4444" : "#3b82f6";
      }
    } else if (room.discovered) {
      roomColor = "#334155";
    }

    ctx.fillStyle = roomColor;
    ctx.fillRect(cellX + 2, cellY + 2, cellSize - 4, cellSize - 4);

    if (key === currentRoomKey) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cellX + cellSize / 2, cellY + cellSize / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    if (room.roomType === 'exit') {
      ctx.fillStyle = "#0f172a";
      ctx.fillText("★", cellX + cellSize / 2, cellY + cellSize / 2 + 4);
    } else if (room.roomType === 'entrance') {
      ctx.fillStyle = "#0f172a";
      ctx.fillText("▶", cellX + cellSize / 2, cellY + cellSize / 2 + 3);
    }
  });

  // 탐험률 표시
  const totalRooms = Object.keys(grid).length;
  const visitedRooms = Object.values(grid).filter(r => r.visited).length;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`탐험: ${visitedRooms}/${totalRooms}`, minimapX + minimapW / 2, minimapY + minimapH + 5);
}

/**
 * 플레이어 렌더링
 */
function renderPlayer(ctx, playerX, playerY, cameraX) {
  const playerScreenX = playerX - cameraX;
  ctx.fillStyle = "#3498db";
  ctx.fillRect(
    playerScreenX - CONFIG.PLAYER.width / 2,
    playerY,
    CONFIG.PLAYER.width,
    CONFIG.PLAYER.height
  );
}

/**
 * 플레이어 상태 바 렌더링 (에테르, HP)
 */
function renderPlayerBars(ctx, playerX, playerY, cameraX, resources, playerHp, maxHp) {
  const playerScreenX = playerX - cameraX;
  const etherPts = resources.etherPts || 0;
  const etherSlots = calculateEtherSlots(etherPts);
  const etherProgress = getSlotProgress(etherPts);
  const etherCurrentPts = getCurrentSlotPts(etherPts);
  const etherNextSlotCost = getNextSlotCost(etherPts);

  // 에테르 바 (상단)
  const etherW = 60;
  const etherH = 8;
  const etherY = playerY - 20;

  ctx.fillStyle = "#333";
  ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW, etherH);

  ctx.fillStyle = "#53d7ff";
  ctx.fillRect(playerScreenX - etherW / 2, etherY, etherW * etherProgress, etherH);

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
}

/**
 * 메인 렌더링 함수
 */
export function renderDungeonScene({
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
}) {
  ctx.clearRect(0, 0, CONFIG.VIEWPORT.width, CONFIG.VIEWPORT.height);

  renderBackground(ctx, segment);
  renderRoomLabel(ctx, segment);
  renderDoors(ctx, segment, grid);
  renderObjects(ctx, segment, cameraX);
  renderMinimap(ctx, grid, currentRoomKey, mazeData);
  renderPlayer(ctx, playerX, playerY, cameraX);
  renderPlayerBars(ctx, playerX, playerY, cameraX, resources, playerHp, maxHp);
}
