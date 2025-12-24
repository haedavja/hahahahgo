/**
 * @file mazeGenerator.js
 * @description 미로 및 던전 생성 알고리즘
 *
 * ## 생성 알고리즘
 * - 재귀적 미로 생성
 * - 기로 템플릿 배치
 * - 오브젝트 랜덤 배치
 *
 * ## 배치 규칙
 * - 벽: 외곽 및 미로 구조
 * - 문: 주요 통로 연결
 * - 기로: 선택지 이벤트 발생 지점
 * - 보물: 랜덤 보상 오브젝트
 *
 * @typedef {Object} GridCell
 * @property {number} type - 셀 타입 (0: 바닥, 1: 벽, ...)
 * @property {Object|null} object - 배치된 오브젝트
 */

import { CONFIG, OBJECT_TYPES, DIRECTIONS } from './dungeonConfig';
import { OBSTACLE_TEMPLATES } from '../../../data/dungeonNodes';

// ========== 기로 템플릿 선택 ==========
export function getRandomCrossroadTemplate(forcedTemplateId = null) {
  // 강제 템플릿이 지정된 경우
  if (forcedTemplateId && OBSTACLE_TEMPLATES[forcedTemplateId]) {
    console.log('[Dungeon] 강제 기로 템플릿 사용:', forcedTemplateId);
    return { ...OBSTACLE_TEMPLATES[forcedTemplateId] };
  }
  const templates = Object.keys(OBSTACLE_TEMPLATES);
  const key = templates[Math.floor(Math.random() * templates.length)];
  return { ...OBSTACLE_TEMPLATES[key] };
}

// ========== 방 생성 ==========
export function createRoom(x, y, roomType) {
  const objects = [];

  // 입구/출구가 아닌 경우 오브젝트 생성
  if (roomType !== 'entrance' && roomType !== 'exit') {
    const count = 1 + Math.floor(Math.random() * 2); // 1-2개

    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let type = null;

      if (rand < 0.35) {
        type = OBJECT_TYPES.CHEST;
      } else if (rand < 0.60) {
        type = OBJECT_TYPES.CURIO;
      } else {
        type = OBJECT_TYPES.COMBAT;
      }

      objects.push({
        id: `obj_${x}_${y}_${i}`,
        typeId: type.id,
        x: 350 + i * 250 + Math.random() * 100,
        used: false,
      });
    }
  }

  return {
    id: `room_${x}_${y}`,
    x,
    y,
    roomType,
    exits: { north: null, south: null, east: null, west: null },
    objects,
    visited: roomType === 'entrance', // 입구는 시작부터 방문
    discovered: roomType !== 'hidden', // 숨겨진 방은 발견되지 않은 상태
    width: CONFIG.ROOM_WIDTH,
    isDeadEnd: false,
  };
}

// ========== 미로 최소 전투 보장 ==========
export function ensureMazeMinimumCombats(grid, minCount) {
  const rooms = Object.values(grid);
  const combatCount = rooms.reduce((sum, room) =>
    sum + room.objects.filter(o => o.typeId === "combat").length, 0
  );

  let needed = minCount - combatCount;

  while (needed > 0) {
    const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
    if (randomRoom.roomType === 'entrance' || randomRoom.roomType === 'exit') continue;

    const nonCombat = randomRoom.objects.filter(o => o.typeId !== "combat" && o.typeId !== "crossroad");
    if (nonCombat.length > 0) {
      nonCombat[0].typeId = "combat";
      needed--;
    } else {
      break;
    }
  }
}

// ========== 미로 생성 알고리즘 ==========
export function generateMaze(forcedCrossroadId = null) {
  const { GRID_SIZE, MIN_ROOMS, MAX_ROOMS, DEAD_END_REWARD, HIDDEN_ROOM_CHANCE, LOOP_CHANCE } = CONFIG.MAZE;

  // 그리드 초기화
  const grid = {};
  const getKey = (x, y) => `${x},${y}`;

  // 시작 위치 (중앙 하단)
  const startX = Math.floor(GRID_SIZE / 2);
  const startY = GRID_SIZE - 1;

  // 출구 위치 (중앙 상단 근처)
  const exitX = Math.floor(GRID_SIZE / 2);
  const exitY = 0;

  // DFS로 미로 생성
  const stack = [{ x: startX, y: startY }];
  const visited = new Set();
  visited.add(getKey(startX, startY));

  // 첫 방 생성
  grid[getKey(startX, startY)] = createRoom(startX, startY, 'entrance');

  while (stack.length > 0 && visited.size < MAX_ROOMS) {
    const current = stack[stack.length - 1];
    const { x, y } = current;

    // 이웃 방향 섞기
    const directions = Object.keys(DIRECTIONS).sort(() => Math.random() - 0.5);
    let foundNext = false;

    for (const dir of directions) {
      const { dx, dy, opposite } = DIRECTIONS[dir];
      const nx = x + dx;
      const ny = y + dy;
      const neighborKey = getKey(nx, ny);

      // 그리드 범위 체크
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;

      if (!visited.has(neighborKey)) {
        // 새 방 생성
        visited.add(neighborKey);

        // 숨겨진 방 결정
        const isHidden = Math.random() < HIDDEN_ROOM_CHANCE && visited.size > 3;
        const roomType = (nx === exitX && ny === exitY) ? 'exit' : (isHidden ? 'hidden' : 'normal');

        grid[neighborKey] = createRoom(nx, ny, roomType);

        // 연결 (숨겨진 방은 hidden_door로 연결)
        if (isHidden) {
          grid[getKey(x, y)].exits[dir] = { type: 'hidden', targetKey: neighborKey };
          grid[neighborKey].exits[opposite] = { type: 'hidden', targetKey: getKey(x, y) };
        } else {
          grid[getKey(x, y)].exits[dir] = { type: 'normal', targetKey: neighborKey };
          grid[neighborKey].exits[opposite] = { type: 'normal', targetKey: getKey(x, y) };
        }

        stack.push({ x: nx, y: ny });
        foundNext = true;
        break;
      }
    }

    if (!foundNext) {
      stack.pop();
    }
  }

  // 출구가 없으면 강제 생성
  if (!grid[getKey(exitX, exitY)]) {
    // 가장 가까운 방에서 출구로 연결
    let closestRoom = null;
    let minDist = Infinity;

    for (const key of Object.keys(grid)) {
      const [rx, ry] = key.split(',').map(Number);
      const dist = Math.abs(rx - exitX) + Math.abs(ry - exitY);
      if (dist < minDist && dist > 0) {
        minDist = dist;
        closestRoom = { x: rx, y: ry, key };
      }
    }

    if (closestRoom) {
      // 출구까지 경로 생성
      let cx = closestRoom.x;
      let cy = closestRoom.y;

      while (cx !== exitX || cy !== exitY) {
        const currentKey = getKey(cx, cy);
        let nextX = cx;
        let nextY = cy;
        let dir = null;

        if (cx !== exitX) {
          nextX = cx + (exitX > cx ? 1 : -1);
          dir = exitX > cx ? 'east' : 'west';
        } else if (cy !== exitY) {
          nextY = cy + (exitY > cy ? 1 : -1);
          dir = exitY > cy ? 'south' : 'north';
        }

        const nextKey = getKey(nextX, nextY);
        const opposite = DIRECTIONS[dir].opposite;

        if (!grid[nextKey]) {
          const roomType = (nextX === exitX && nextY === exitY) ? 'exit' : 'normal';
          grid[nextKey] = createRoom(nextX, nextY, roomType);
        }

        grid[currentKey].exits[dir] = { type: 'normal', targetKey: nextKey };
        grid[nextKey].exits[opposite] = { type: 'normal', targetKey: currentKey };

        cx = nextX;
        cy = nextY;
      }
    }
  }

  // 루프 추가 (대체 경로)
  const roomKeys = Object.keys(grid);
  for (const key of roomKeys) {
    const [x, y] = key.split(',').map(Number);
    const room = grid[key];

    for (const [dir, { dx, dy, opposite }] of Object.entries(DIRECTIONS)) {
      if (room.exits[dir]) continue; // 이미 연결됨

      const nx = x + dx;
      const ny = y + dy;
      const neighborKey = getKey(nx, ny);

      if (grid[neighborKey] && Math.random() < LOOP_CHANCE) {
        // 루프 연결
        room.exits[dir] = { type: 'normal', targetKey: neighborKey };
        grid[neighborKey].exits[opposite] = { type: 'normal', targetKey: key };
      }
    }
  }

  // 막다른 방에 보상 추가
  for (const key of roomKeys) {
    const room = grid[key];
    const exitCount = Object.values(room.exits).filter(e => e).length;

    if (exitCount === 1 && room.roomType !== 'entrance' && room.roomType !== 'exit') {
      // 막다른 방
      room.isDeadEnd = true;
      if (Math.random() < DEAD_END_REWARD) {
        // 특별 보상 추가
        room.objects.push({
          id: `treasure_${key}`,
          typeId: "chest",
          x: 600,
          used: false,
          isSpecial: true, // 특별 보물
        });
      }
    }
  }

  // 기로 추가
  const normalRooms = roomKeys.filter(k => {
    const r = grid[k];
    return r.roomType === 'normal' && !r.isDeadEnd;
  });

  if (normalRooms.length > 0) {
    const crossroadRoom = normalRooms[Math.floor(Math.random() * normalRooms.length)];
    const template = getRandomCrossroadTemplate(forcedCrossroadId);
    grid[crossroadRoom].objects.push({
      id: `crossroad_${crossroadRoom}`,
      typeId: "crossroad",
      x: 800,  // 문과 겹치지 않는 위치 (남쪽 600, 북쪽 1000 피함)
      used: false,
      template: template,
      choiceState: {},
    });
  }

  // 최소 전투 보장
  ensureMazeMinimumCombats(grid, CONFIG.MIN_COMBAT_COUNT);

  console.log('[Maze] 생성 완료 - 방 개수:', Object.keys(grid).length);

  return {
    grid,
    startKey: getKey(startX, startY),
    exitKey: getKey(exitX, exitY),
    gridSize: GRID_SIZE,
  };
}

// ========== 레거시 던전 생성 ==========
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

export function generateDungeon(forcedCrossroadId = null) {
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
