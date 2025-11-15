const MAP_COLUMNS = 7;
const MAP_LAYERS = 11;
const MAP_MIN_NODES = 2;
const MAP_MAX_NODES = 4;
const MAP_WIDTH = 960;
const V_SPACING = 360;
const LAYER_TOP_OFFSET = 60;

const columnToX = (column) => (MAP_WIDTH / (MAP_COLUMNS + 1)) * (column + 1);
const layerToY = (layerIdx) => (MAP_LAYERS - 1 - layerIdx) * V_SPACING + LAYER_TOP_OFFSET;

const shuffle = (list) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const nearestByColumn = (nodes, column) =>
  nodes.reduce((closest, node) => {
    const diff = Math.abs(node.column - column);
    if (!closest || diff < closest.diff) return { node, diff };
    return closest;
  }, null).node;

const generateLayerColumns = (layerIdx) => {
  if (layerIdx === 0 || layerIdx === MAP_LAYERS - 1) return [Math.floor(MAP_COLUMNS / 2)];
  const count = randomInt(MAP_MIN_NODES, MAP_MAX_NODES);
  const options = shuffle(Array.from({ length: MAP_COLUMNS }, (_, i) => i));
  return options.slice(0, count).sort((a, b) => a - b);
};

const assignNodeTypes = (nodes) => {
  const startNode = nodes.find((n) => n.layer === 0);
  const bossNode = nodes.find((n) => n.layer === MAP_LAYERS - 1);
  if (startNode) {
    startNode.type = "event";
    startNode.isStart = true;
  }
  if (bossNode) bossNode.type = "boss";

  const candidates = nodes.filter((n) => n !== startNode && n !== bossNode);
  const shuffled = shuffle(candidates);
  const eventTarget = Math.max(1, Math.round(shuffled.length * 0.5));
  shuffled.slice(0, eventTarget).forEach((node) => {
    node.type = "event";
  });

  const remaining = shuffled.slice(eventTarget);
  const pool = ["battle", "battle", "battle", "rest", "shop", "elite", "dungeon"];
  remaining.forEach((node) => {
    node.type = pool[Math.floor(Math.random() * pool.length)];
  });

  let dungeonCandidate = nodes.find((n) => n.type === "dungeon");
  if (!dungeonCandidate) {
    const selectPool = nodes.filter((n) => !n.isStart && n.type !== "boss");
    if (selectPool.length) {
      dungeonCandidate = selectPool[Math.floor(Math.random() * selectPool.length)];
      dungeonCandidate.type = "dungeon";
    }
  }

  nodes.forEach((node) => {
    if (node.type === "dungeon") {
      node.dungeonData = {
        size: ["3개의 방", "4개의 방", "5개의 방", "6개의 방", "중앙 복도 2개"][Math.floor(Math.random() * 5)],
        type: ["언데드가 가득", "기계 잔재", "원소 혼탁", "괴생명체", "시간왜곡"][Math.floor(Math.random() * 5)],
      };
    }
    node.displayLabel = node.isStart ? "Start" : node.type === "event" ? "?" : node.type.toUpperCase();
  });
};

const generateMap = () => {
  const layers = [];
  for (let layer = 0; layer < MAP_LAYERS; layer += 1) {
    const columns = generateLayerColumns(layer);
    const nodes = columns.map((column, index) => ({
      id: `L${layer}-N${index}`,
      layer,
      column,
      x: columnToX(column),
      y: layerToY(layer),
      type: "battle",
      displayLabel: "BATTLE",
      connections: [],
    }));
    layers.push(nodes);
  }

  for (let layer = 0; layer < MAP_LAYERS - 1; layer += 1) {
    const current = layers[layer];
    const next = layers[layer + 1];
    current.forEach((node) => {
      let targets = next.filter((candidate) => Math.abs(candidate.column - node.column) <= 1);
      if (!targets.length) targets = [nearestByColumn(next, node.column)];
      node.connections = targets.map((target) => target.id);
    });
    next.forEach((node) => {
      const inbound = current.some((prev) => prev.connections.includes(node.id));
      if (!inbound) {
        const fallback = nearestByColumn(current, node.column);
        fallback.connections.push(node.id);
      }
    });
  }

  const flatNodes = layers.flat();
  assignNodeTypes(flatNodes);
  flatNodes.forEach((node) => {
    node.cleared = node.layer === 0;
    node.selectable = node.layer === 1 || node.isStart;
  });

  return {
    nodes: flatNodes,
    currentNodeId: flatNodes.find((node) => node.layer === 0).id,
  };
};

export const createInitialState = () => ({
  map: generateMap(),
  mapRisk: Math.floor(Math.random() * 61) + 20,
  resources: { gold: 40, intel: 2, loot: 1, material: 1, aether: 1 },
  activeEvent: null,
  activeDungeon: null,
  activeBattle: null,
  lastBattleResult: null,
});
