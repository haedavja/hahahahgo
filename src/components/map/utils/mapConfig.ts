/**
 * @file mapConfig.js
 * @description 맵 상수 및 유틸리티
 *
 * ## 레이아웃
 * - 960px 너비, 11개 레이어
 * - 노드: 96x100px
 */

// 레이아웃 상수
export const NODE_WIDTH = 96;
export const NODE_HEIGHT = 100;
export const MAP_WIDTH = 960;
export const MAP_LAYERS = 11;
export const V_SPACING = 220;

// 노드 아이콘 매핑
export const ICON_MAP = {
  battle: "⚔️",
  elite: "⛧",
  shop: "🛒",
  event: "?",
  rest: "⛺",
  boss: "👑",
  dungeon: "☠️",
};

// 맵 범례
export const LEGEND = [
  { icon: "⚔️", label: "전투" },
  { icon: "⛧", label: "정예" },
  { icon: "🛒", label: "상점" },
  { icon: "⛺", label: "야영" },
  { icon: "?", label: "이벤트" },
  { icon: "☠️", label: "던전" },
  { icon: "👑", label: "보스" },
];

// 자원 레이블
export const RESOURCE_LABELS = {
  gold: "금",
  intel: "정보",
  loot: "전리품",
  material: "원자재",
  etherPts: "에테르",
  grace: "은총화",
  memory: "기억",
  card: "카드",
  insight: "통찰",
  strength: "힘",
  agility: "민첩",
  hp: "체력",
  relic: "상징",
};

// 스탯 레이블
export const STAT_LABELS = {
  insight: "통찰",
  strength: "힘",
  agility: "민첩",
};

// 패치 버전 태그
export const PATCH_VERSION_TAG = "01-02 01:14";

// 유틸리티 함수들
export const describeAmount = (value: number | { min: number; max: number } | null | undefined) => {
  if (value == null) return "0";
  if (typeof value === "number") return `${value}`;
  const min = value.min ?? 0;
  const max = value.max ?? min;
  return min === max ? `${min}` : `${min}~${max}`;
};

const resourceLabelsRecord = RESOURCE_LABELS as Record<string, string>;

export const describeBundle = (bundle: Record<string, unknown> = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${resourceLabelsRecord[key] ?? key} ${describeAmount(amount as number | { min: number; max: number } | null | undefined)}`).join(", ");
};

export const describeCost = (cost: Record<string, number> = {}) => {
  const entries = Object.entries(cost || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${resourceLabelsRecord[key] ?? key} ${amount}`).join(", ");
};

export const formatApplied = (bundle: Record<string, unknown> = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries
    .map(([key, amount]) => {
      const numeric = typeof amount === "number" ? amount : 0;
      const prefix = numeric > 0 ? "+" : "";
      return `${resourceLabelsRecord[key] ?? key} ${prefix}${numeric}`;
    })
    .join(", ");
};

export const canAfford = (resources: Record<string, number>, cost: Record<string, number> = {}) =>
  Object.entries(cost)
    .filter(([key]: [string, number]) => key !== 'hp' && key !== 'hpPercent')
    .every(([key, value]: [string, number]) => (resources[key] ?? 0) >= value);

export const formatBattleLogEntry = (entry: string | Record<string, unknown>): string => {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const actorLabel =
    entry.actor === "player" ? "플레이어" : entry.actor === "enemy" ? "적" : entry.actor ?? "";
  const cardLabel = entry.name ?? entry.cardId ?? "행동";
  const detail = (entry.detail ?? {}) as Record<string, unknown>;

  if (detail.type === "attack") {
    const dmg = detail.hpDamage ?? 0;
    const blocked = detail.blocked ?? 0;
    return `${actorLabel} ${cardLabel} 공격: 피해 ${dmg}, 차단 ${blocked}`;
  }
  if (detail.type === "block") {
    return `${actorLabel} ${cardLabel} 방어 +${detail.block ?? 0}`;
  }
  if (detail.type === "support") {
    return `${actorLabel} ${cardLabel} 보조 효과 발동`;
  }
  if (entry.events && Array.isArray(entry.events)) {
    return entry.events.map(formatBattleLogEntry).join(", ");
  }
  return `${actorLabel} ${cardLabel}`;
};

export const friendlyPercent = (chance: number | null | undefined) => {
  if (typeof chance !== "number") return null;
  return `${Math.round(chance * 100)}%`;
};
