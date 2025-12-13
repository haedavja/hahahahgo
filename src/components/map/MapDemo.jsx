import { useEffect, useMemo, useRef, useState, useCallback, useReducer } from "react";
import { useMapState } from "./hooks/useMapState";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { DungeonExploration } from "../dungeon/DungeonExploration";
import { LegacyBattleScreen } from "../battle/LegacyBattleScreen";
import { EtherBar } from "../battle/ui/EtherBar";
import { DevTools } from "../dev/DevTools";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { RELIC_RARITY_COLORS } from "../../lib/relics";
import { CARDS } from "../battle/battleData";
import { CARD_ETHER_BY_RARITY } from "../battle/utils/etherCalculations";
import { applyNodeMoveEther } from "../../lib/relicEffects";

const NODE_WIDTH = 96;
const NODE_HEIGHT = 100;
const MAP_WIDTH = 960;
const MAP_LAYERS = 11;
const V_SPACING = 220;
const PRAYER_COSTS = [1, 3, 5];

const ICON_MAP = {
  battle: "⚔️",
  elite: "⛧",
  shop: "🛒",
  event: "?",
  rest: "⛺",
  boss: "👑",
  dungeon: "☠️",
};

const LEGEND = [
  { icon: "⚔️", label: "전투" },
  { icon: "⛧", label: "정예" },
  { icon: "🛒", label: "상점" },
  { icon: "⛺", label: "야영" },
  { icon: "?", label: "이벤트" },
  { icon: "☠️", label: "던전" },
  { icon: "👑", label: "보스" },
];

const RESOURCE_LABELS = {
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
  relic: "유물",
};

const STAT_LABELS = {
  insight: "통찰",
  strength: "힘",
  agility: "민첩",
};

const describeAmount = (value) => {
  if (value == null) return "0";
  if (typeof value === "number") return `${value}`;
  const min = value.min ?? 0;
  const max = value.max ?? min;
  return min === max ? `${min}` : `${min}~${max}`;
};

const describeBundle = (bundle = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${describeAmount(amount)}`).join(", ");
};

const describeCost = (cost = {}) => {
  const entries = Object.entries(cost || {});
  if (!entries.length) return "없음";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${amount}`).join(", ");
};

const formatApplied = (bundle = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "없음";
  return entries
    .map(([key, amount]) => {
      const numeric = typeof amount === "number" ? amount : 0;
      const prefix = numeric > 0 ? "+" : "";
      return `${RESOURCE_LABELS[key] ?? key} ${prefix}${numeric}`;
    })
    .join(", ");
};

const canAfford = (resources, cost = {}) =>
  Object.entries(cost)
    .filter(([key]) => key !== 'hp' && key !== 'hpPercent') // HP 비용은 항상 선택 가능
    .every(([key, value]) => (resources[key] ?? 0) >= value);

const formatBattleLogEntry = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  const actorLabel =
    entry.actor === "player" ? "플레이어" : entry.actor === "enemy" ? "적" : entry.actor ?? "";
  const cardLabel = entry.name ?? entry.cardId ?? "행동";
  const detail = entry.detail ?? {};

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

const friendlyPercent = (chance) => {
  if (typeof chance !== "number") return null;
  return `${Math.round(chance * 100)}%`;
};

const PATCH_VERSION_TAG = "12-12-10:58"; // 다음 패치마다 여기를 최신 시간(월-일-시-분, KST)으로 갱신하세요.

/* v11-25-19:33 갱신 내역
 * - 카드 스탯 폰트 크기 일원화 및 확대:
 *   - 선택/대응 단계 모두 text-sm → text-lg (14px → 18px)
 *   - 속도: 0.75rem/text-xs → 1.125rem/text-lg (12px → 18px)
 *   - 공격력, 방어력, 속도 숫자 모두 동일한 크기로 통일
 * - 속도/선택 텍스트 색상 변경: #94a3b8 → #7dd3fc (옅은 하늘색)
 * - 제출 버튼 아이콘 크기 조정: 20 → 18 (리드로우 버튼과 동일한 높이)
 */

export function MapDemo() {
  const map = useGameStore((state) => state.map);
  const resources = useGameStore((state) => state.resources || {});
  const prevEtherRef = useRef(resources.etherPts ?? 0);
  const mapRisk = useGameStore((state) => state.mapRisk);
  const activeEvent = useGameStore((state) => state.activeEvent);
  const activeBattle = useGameStore((state) => state.activeBattle);
  const activeDungeon = useGameStore((state) => state.activeDungeon);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const relics = useGameStore((state) => state.relics);
  const items = useGameStore((state) => state.items || [null, null, null]);
  const activeRest = useGameStore((state) => state.activeRest);
  const mergeRelicOrder = useCallback((relicList = [], saved = []) => {
    const savedSet = new Set(saved);
    const merged = [];
    saved.forEach(id => { if (relicList?.includes(id)) merged.push(id); });
    (relicList || []).forEach(id => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);

  // orderedRelics 초기값 계산 (localStorage 복원)
  const initialOrderedRelics = useMemo(() => {
    try {
      const saved = localStorage.getItem("relicOrder");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics || [], ids);
      }
    } catch { }
    return relics || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map UI 상태 (useReducer 기반)
  const { mapUI, actions } = useMapState({
    orderedRelics: initialOrderedRelics,
  });

  // Destructure map UI state
  const showCharacterSheet = mapUI.showCharacterSheet;
  const isDungeonExploring = mapUI.isDungeonExploring;
  const devToolsOpen = mapUI.devToolsOpen;
  const hoveredRelic = mapUI.hoveredRelic;
  const orderedRelics = mapUI.orderedRelics;
  const relicActivated = mapUI.relicActivated;

  const dragRelicIndexRef = useRef(null);
  useEffect(() => {
    // 새 유물 추가/제거 시 순서를 유지하면서 병합
    actions.setOrderedRelics((prev) => {
      return mergeRelicOrder(relics || [], prev);
    });
  }, [relics, mergeRelicOrder, actions]);
  useEffect(() => {
    try {
      localStorage.setItem("relicOrder", JSON.stringify(orderedRelics));
    } catch { }
  }, [orderedRelics]);
  const selectNode = useGameStore((state) => state.selectNode);
  const chooseEvent = useGameStore((state) => state.chooseEvent);
  const closeEvent = useGameStore((state) => state.closeEvent);
  const invokePrayer = useGameStore((state) => state.invokePrayer);
  const clearBattleResult = useGameStore((state) => state.clearBattleResult);
  const skipDungeon = useGameStore((state) => state.skipDungeon);
  const confirmDungeon = useGameStore((state) => state.confirmDungeon);
  const bypassDungeon = useGameStore((state) => state.bypassDungeon);
  const playerHp = useGameStore((state) => state.playerHp);
  const maxHp = useGameStore((state) => state.maxHp);
  const awakenAtRest = useGameStore((state) => state.awakenAtRest);
  const closeRest = useGameStore((state) => state.closeRest);
  const healAtRest = useGameStore((state) => state.healAtRest);
  const formEgo = useGameStore((state) => state.formEgo);
  const playerTraits = useGameStore((state) => state.playerTraits || []);
  const upgradeCardRarity = useGameStore((state) => state.upgradeCardRarity);
  const cardUpgrades = useGameStore((state) => state.cardUpgrades || {});
  const playerInsight = useGameStore((state) => state.playerInsight || 0);
  const playerStrength = useGameStore((state) => state.playerStrength || 0);
  const playerAgility = useGameStore((state) => state.playerAgility || 0);
  const useItem = useGameStore((state) => state.useItem);
  const itemBuffs = useGameStore((state) => state.itemBuffs || {});

  // 아이템 버프를 포함한 유효 스탯 계산
  const effectiveStrength = playerStrength + (itemBuffs.strength || 0);
  const effectiveAgility = playerAgility + (itemBuffs.agility || 0);
  const effectiveInsight = playerInsight + (itemBuffs.insight || 0);

  // 스탯 요구사항 충족 여부 체크 (아이템 버프 포함)
  const meetsStatRequirement = useCallback((statRequirement) => {
    if (!statRequirement) return true;
    const playerStats = {
      insight: effectiveInsight,
      strength: effectiveStrength,
      agility: effectiveAgility,
    };
    return Object.entries(statRequirement).every(
      ([stat, required]) => (playerStats[stat] ?? 0) >= required
    );
  }, [effectiveInsight, effectiveStrength, effectiveAgility]);

  // Alt+D 핫키로 DevTools 토글
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        actions.setDevToolsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const nodes = map?.nodes ?? [];
  const mapViewRef = useRef(null);
  const riskDisplay = Number.isFinite(mapRisk) ? mapRisk.toFixed(1) : "-";
  const memoryValue = resources.memory ?? 0;
  const canAwaken = memoryValue >= 100;

  // 자아 형성용 상태
  const [egoFormMode, setEgoFormMode] = useState(false);
  const [selectedTraitsForEgo, setSelectedTraitsForEgo] = useState([]);
  const canFormEgo = playerTraits.length >= 5;
  const aetherValue = resources.etherPts ?? 0;
  const aetherSlots = calculateEtherSlots(aetherValue); // 인플레이션 적용
  const aetherCurrentPts = getCurrentSlotPts(aetherValue); // 현재 슬롯 내의 pt (슬롯마다 0으로 리셋)
  const aetherNextSlotCost = getNextSlotCost(aetherValue); // 다음 슬롯을 채우는데 필요한 총 pt
  const aetherProgress = getSlotProgress(aetherValue); // 다음 슬롯까지의 진행률 (0-1)
  const aetherRatio = Math.max(0, Math.min(1, aetherProgress)); // 시각적 바 높이
  const aetherTier = `x${aetherSlots}`;
  const hpRatio = Math.max(0, Math.min(1, playerHp / maxHp)); // HP 비율
  const hpColor = hpRatio > 0.5 ? "#86efac" : hpRatio > 0.25 ? "#fde047" : "#fca5a5";

  // 황금 나침반 발동 표시: 에테르가 증가했고 유물이 있을 때 배지/사운드
  useEffect(() => {
    const prev = prevEtherRef.current ?? 0;
    const curr = resources.etherPts ?? 0;
    const delta = curr - prev;
    prevEtherRef.current = curr;
    if (delta > 0 && relics?.includes('redCompass')) {
      actions.setRelicActivated('redCompass');
      const t = setTimeout(() => actions.setRelicActivated(null), 700);
      return () => clearTimeout(t);
    }
  }, [resources.etherPts, relics, actions]);

  const mapHeight = useMemo(() => {
    if (!nodes.length) return 800;
    const maxY = Math.max(...nodes.map((node) => node.y), 0);
    return maxY + NODE_HEIGHT + 200;
  }, [nodes]);

  const edges = useMemo(
    () =>
      nodes
        .map((node) =>
          node.connections
            .map((targetId) => {
              const target = nodes.find((candidate) => candidate.id === targetId);
              return target ? { from: node, to: target } : null;
            })
            .filter(Boolean),
        )
        .flat(),
    [nodes],
  );

  const activeDungeonNode = useMemo(() => {
    if (!activeDungeon) return null;
    return nodes.find((node) => node.id === activeDungeon.nodeId) ?? null;
  }, [activeDungeon, nodes]);

  useEffect(() => {
    if (!mapViewRef.current || !map?.currentNodeId) return;
    const container = mapViewRef.current;
    const target = container.querySelector(`[data-node-id="${map.currentNodeId}"]`);
    if (!target) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left - containerRect.left + container.scrollLeft + targetRect.width / 2;
    const centerY = targetRect.top - containerRect.top + container.scrollTop + targetRect.height / 2;
    container.scrollTo({
      left: Math.max(0, centerX - container.clientWidth / 2),
      top: Math.max(0, centerY - container.clientHeight / 2),
      behavior: "smooth",
    });
  }, [map?.currentNodeId]);

  // C 키로 캐릭터 창 열기
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "c" || e.key === "C") {
        actions.setShowCharacterSheet((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [actions]);

  // 던전 탐험 상태 관리
  useEffect(() => {
    if (activeDungeon?.confirmed) {
      // 던전 진입 확정 시 탐험 시작
      actions.setIsDungeonExploring(true);
    } else if (!activeDungeon) {
      // activeDungeon이 사라졌을 때
      if (!activeBattle) {
        // 전투 중이 아니면 즉시 탐험 종료 (탈출/완료)
        actions.setIsDungeonExploring(false);
      }
      // 전투 중이면 그대로 유지 (던전 내 전투)
    }
  }, [activeDungeon, activeBattle, actions]);

  const availablePrayers = useMemo(
    () => PRAYER_COSTS.filter((cost) => (resources.etherPts ?? 0) >= cost),
    [resources.etherPts],
  );

  const handleNodeClick = (node) => {
    if (!node || node.cleared || !node.selectable) return;
    selectNode(node.id);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>로그라이크 경로 지도</h1>
        <small>속도 시스템 기준 · React + Vite 시연</small>
      </header>

      {/* 유물 표시 */}
      {orderedRelics && orderedRelics.length > 0 && (
        <div style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid rgba(148, 163, 184, 0.5)',
            borderRadius: '12px',
            boxShadow: '0 0 15px rgba(148, 163, 184, 0.3)',
            pointerEvents: 'auto',
          }}>
            {orderedRelics.map((relicId, index) => {
              const relic = RELICS[relicId];
              if (!relic) return null;

              const isHovered = hoveredRelic === relicId;
              const isActivated = relicActivated === relicId;
              const rarityText = {
                [RELIC_RARITIES.COMMON]: '일반',
                [RELIC_RARITIES.RARE]: '희귀',
                [RELIC_RARITIES.SPECIAL]: '특별',
                [RELIC_RARITIES.LEGENDARY]: '전설'
              }[relic.rarity] || '알 수 없음';

              return (
                <div
                  key={index}
                  style={{ position: 'relative' }}
                  draggable
                  onDragStart={(e) => {
                    dragRelicIndexRef.current = index;
                    actions.setRelicActivated(relicId);
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                      const img = new Image();
                      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    } catch { }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragRelicIndexRef.current;
                    dragRelicIndexRef.current = null;
                    actions.setRelicActivated(null);
                    if (from === null || from === index) return;
                    const next = Array.from(orderedRelics);
                    const [item] = next.splice(from, 1);
                    next.splice(index, 0, item);
                    actions.setOrderedRelics(next);
                  }}
                  onMouseDown={() => {
                    actions.setRelicActivated(prev => prev === relicId ? null : relicId);
                  }}
                >
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
                      transform: isActivated ? 'scale(1.2)' : (isHovered ? 'scale(1.15)' : 'scale(1)'),
                      filter: isActivated ? 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.75))' : 'drop-shadow(0 0 4px rgba(255,255,255,0.15))',
                      background: isActivated ? 'rgba(251, 191, 36, 0.2)' : (isHovered ? 'rgba(148, 163, 184, 0.15)' : 'transparent'),
                      border: isActivated ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid transparent',
                      borderRadius: '8px',
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

      <div className="legend">
        {LEGEND.map((item) => (
          <span key={item.label}>
            {item.icon} {item.label}
          </span>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 120, left: 20, zIndex: 9999 }}>
        <button
          onClick={() => {
            useGameStore.setState({
              activeBattle: {
                nodeId: "test-mixed",
                kind: "battle",
                label: "Mixed Mob",
                enemies: ["goblin", "slime"],
                enemyCount: 2,
                simulation: { initialState: { enemy: { hp: 1 } } }
              }
            });
          }}
          style={{
            padding: '8px 12px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '6px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            cursor: 'pointer'
          }}
        >
          ⚔️ Test Mixed Battle
        </button>
      </div>

      <div className="main-layout">
        <div className="map-container">
          <div className="map-view" ref={mapViewRef} style={{ marginLeft: '400px' }}>
            <section className="map" style={{ minHeight: mapHeight, width: MAP_WIDTH, margin: "0 auto", padding: "40px 0 60px" }}>
              <svg className="edge-layer" width={MAP_WIDTH} height={MAP_LAYERS * V_SPACING + 200}>
                {edges.map(({ from, to }) => (
                  <line key={`${from.id}-${to.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
                ))}
              </svg>

              {nodes.map((node) => (
                <button
                  key={node.id}
                  data-node-id={node.id}
                  type="button"
                  className={[
                    "node",
                    node.type,
                    node.selectable ? "selectable" : "",
                    node.cleared ? "cleared" : "",
                    node.isStart ? "start" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    left: node.x - NODE_WIDTH / 2,
                    top: node.y - NODE_HEIGHT / 2,
                  }}
                  onClick={() => handleNodeClick(node)}
                >
                  {!node.isStart && <span className="icon">{ICON_MAP[node.type] ?? "?"}</span>}
                  <span>{node.isStart ? "START" : node.type === "event" ? "?" : node.displayLabel}</span>
                  {node.cleared && <strong>CLEAR</strong>}
                </button>
              ))}
            </section>
          </div>
        </div>
      </div>

      <div className="aether-column">
        <EtherBar pts={aetherValue} label="AETHER" />
      </div>

      <div className="hp-column">
        <div className="hp-title">HP</div>
        <div className="hp-bar">
          <div className="hp-fill" style={{ height: `${hpRatio * 100}%`, backgroundColor: hpColor }} />
        </div>
        <div className="hp-remaining">
          <div>{playerHp}/{maxHp}</div>
        </div>
      </div>

      <div className="risk-indicator">위험도 {riskDisplay}%</div>

      {/* 아이템 슬롯 3개 */}
      <div className="item-slots">
        {items.map((item, idx) => {
          const inBattle = !!activeBattle;
          const canUse = item && (item.usableIn === 'any' || (item.usableIn === 'combat' && inBattle));
          return (
            <div
              key={idx}
              className={`item-slot ${item ? 'filled' : 'empty'} ${canUse ? 'usable' : ''}`}
              onClick={() => canUse && useItem(idx)}
              style={{ cursor: canUse ? 'pointer' : 'default' }}
            >
              {item ? (
                <>
                  <span className="item-icon">{item.icon || '?'}</span>
                  {item.usableIn === 'combat' && !inBattle && (
                    <span className="item-combat-only">⚔</span>
                  )}
                  {/* 아이템 툴팁 */}
                  <div className="item-tooltip">
                    <div className="item-tooltip-name">{item.name}</div>
                    <div className="item-tooltip-desc">{item.description}</div>
                    {item.usableIn === 'combat' && (
                      <div className="item-tooltip-usage">
                        {inBattle ? '✓ 선택/대응 단계에서 사용' : '⚔ 전투 선택/대응 단계에서만 사용 가능'}
                      </div>
                    )}
                    {item.usableIn === 'any' && (
                      <div className="item-tooltip-usage" style={{ color: '#86efac' }}>✓ 언제든 사용 가능</div>
                    )}
                  </div>
                </>
              ) : (
                <span className="item-empty">-</span>
              )}
            </div>
          );
        })}
        {/* 아이템 버프 표시 */}
        {Object.keys(itemBuffs).length > 0 && (
          <div className="item-buffs">
            {Object.entries(itemBuffs).map(([stat, value]) => (
              <span key={stat} className="item-buff">
                {STAT_LABELS[stat] || stat} +{value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="resources-display">
        <div style={{ color: "#ffd700", fontSize: "13px" }}>금: {resources.gold}</div>
        <div style={{ color: "#9da9d6", fontSize: "13px" }}>정보: {resources.intel}</div>
        <div style={{ color: "#ff6b6b", fontSize: "13px" }}>전리품: {resources.loot}</div>
        <div style={{ color: "#a0e9ff", fontSize: "13px" }}>원자재: {resources.material}</div>
        <div style={{ color: canAwaken ? "#fb7185" : "#cbd5e1", fontSize: "13px", fontWeight: 700 }}>
          기억: {memoryValue}{canAwaken ? " · 각성 가능" : ""}
        </div>
      </div>

      <div className="map-version-tag">{PATCH_VERSION_TAG}</div>

      {activeEvent && (() => {
        // 현재 스테이지에 맞는 description과 choices 가져오기
        const currentStage = activeEvent.currentStage;
        const stageData = currentStage && activeEvent.definition?.stages?.[currentStage];
        const currentDescription = stageData?.description ?? activeEvent.definition?.description ?? "설명 없음";
        const currentChoices = stageData?.choices ?? activeEvent.definition?.choices ?? [];

        // DEBUG: 이벤트 데이터 확인
        console.log('=== EVENT DEBUG ===');
        console.log('currentStage:', currentStage);
        console.log('definition.choices:', activeEvent.definition?.choices);
        console.log('stageData:', stageData);
        console.log('currentChoices:', currentChoices);

        // 표시할 텍스트: resolved면 resultDescription, 아니면 currentDescription
        const displayText = activeEvent.resolved && activeEvent.outcome?.resultDescription
          ? activeEvent.outcome.resultDescription
          : currentDescription;

        return (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>{activeEvent.definition?.title ?? "미확인 사건"}</h3>
            </header>
            <p style={{ lineHeight: "1.6" }}>{displayText}</p>

            {!activeEvent.resolved && (
              <>
                <div className="event-choices">
                  {currentChoices.map((choice) => {
                    const affordable = canAfford(resources, choice.cost || {});
                    const hasRequiredStats = meetsStatRequirement(choice.statRequirement);
                    const canSelect = affordable && hasRequiredStats;
                    // DEBUG
                    if (choice.statRequirement) {
                      console.log(`[${choice.label}] 스탯요구:`, choice.statRequirement,
                        `보유: insight=${playerInsight}, strength=${playerStrength}, agility=${playerAgility}`,
                        `충족=${hasRequiredStats}, 선택가능=${canSelect}`);
                    }
                    return (
                      <div key={choice.id} className="choice-card">
                        <strong>{choice.label}</strong>
                        {choice.cost && Object.keys(choice.cost).length > 0 && (
                          <small style={{ color: affordable ? undefined : "#ef4444" }}>
                            비용: {describeCost(choice.cost)}
                            {!affordable && " (부족)"}
                          </small>
                        )}
                        {choice.rewards && Object.keys(choice.rewards).length > 0 && (
                          <small>보상: {describeBundle(choice.rewards)}</small>
                        )}
                        {choice.statRequirement && (
                          <small style={{ color: hasRequiredStats ? "#4ade80" : "#ef4444" }}>
                            요구: {Object.entries(choice.statRequirement).map(([k, v]) => `${STAT_LABELS[k] ?? k} ${v}`).join(", ")}
                            {!hasRequiredStats && " (부족)"}
                          </small>
                        )}
                        <button type="button" disabled={!canSelect} onClick={() => chooseEvent(choice.id)}>
                          선택
                        </button>
                      </div>
                    );
                  })}
                </div>

                {availablePrayers.length > 0 && (
                  <div className="event-choices">
                    <strong>기도 (에테르 사용)</strong>
                    {availablePrayers.map((cost) => (
                      <div key={`prayer-${cost}`} className="choice-card">
                        <strong>기도 x{cost}</strong>
                        <p>에테르를 소모해 우호적 결과를 강제합니다.</p>
                        <small>비용: 에테르 {cost}</small>
                        <small>보상: 정보 획득 + 안정화</small>
                        <button type="button" onClick={() => invokePrayer(cost)}>
                          기도한다
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeEvent.resolved && activeEvent.outcome && (
              <div className="event-result">
                {activeEvent.outcome.cost && Object.keys(activeEvent.outcome.cost).length > 0 && (
                  <p>소모: {formatApplied(Object.fromEntries(Object.entries(activeEvent.outcome.cost).map(([k, v]) => [k, -v])))}</p>
                )}
                {activeEvent.outcome.rewards && Object.keys(activeEvent.outcome.rewards).length > 0 && (
                  <p>획득: {formatApplied(activeEvent.outcome.rewards)}</p>
                )}
                <button type="button" className="close-btn" onClick={closeEvent}>
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {activeRest && (
        <div className="event-modal-overlay" onClick={closeRest}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>휴식 · 각성</h3>
              <small>기억 100 소모 시 각성, 체력 회복 또는 카드 강화 선택</small>
            </header>
            <p>기억 보유량: {memoryValue} / 100 · 체력 {playerHp}/{maxHp}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "12px" }}>
              <div className="choice-card">
                <strong>전사</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("brave")}>용맹(+힘1)</button>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("sturdy")}>굳건(+체력10)</button>
                </div>
              </div>
              <div className="choice-card">
                <strong>현자</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("cold")}>냉철(+통찰1)</button>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("thorough")}>철저(+보조슬롯1)</button>
                </div>
              </div>
              <div className="choice-card">
                <strong>영웅</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("passionate")}>열정(+속도5)</button>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("lively")}>활력(+행동력1)</button>
                </div>
              </div>
              <div className="choice-card">
                <strong>신앙</strong>
                <div style={{ marginTop: "8px" }}>
                  <button className="btn" disabled={!canAwaken} onClick={() => awakenAtRest("random")}>랜덤 개성</button>
                </div>
              </div>
              <div className="choice-card">
                <strong>휴식</strong>
                <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    className="btn"
                    onClick={() => {
                      const heal = Math.max(1, Math.round((maxHp || 0) * 0.3));
                      healAtRest(heal);
                      closeRest();
                    }}
                  >
                    체력 회복 (+30% 최대체력)
                  </button>
                  <RestUpgradePanel cardUpgrades={cardUpgrades} onUpgrade={upgradeCardRarity} />
                </div>
              </div>
              <div className="choice-card">
                <strong>자아 형성</strong>
                <div style={{ marginTop: "8px" }}>
                  <button
                    className="btn"
                    disabled={!canFormEgo}
                    onClick={() => {
                      setEgoFormMode(true);
                      setSelectedTraitsForEgo([]);
                    }}
                  >
                    {canFormEgo ? `개성 5개 소모 (보유: ${playerTraits.length}개)` : `개성 부족 (${playerTraits.length}/5)`}
                  </button>
                </div>
              </div>
            </div>

            {/* 자아 형성 모드 */}
            {egoFormMode && (() => {
              // 선택된 개성으로 자아 미리보기 계산
              const selectedTraitNames = selectedTraitsForEgo.map(idx => playerTraits[idx]);
              const traitCounts = selectedTraitNames.reduce((acc, t) => {
                acc[t] = (acc[t] || 0) + 1;
                return acc;
              }, {});

              const egoRules = [
                { ego: '헌신', parts: ['열정적', '용맹함'], emoji: '💪' },
                { ego: '지략', parts: ['냉철함', '용맹함'], emoji: '🧠' },
                { ego: '추격', parts: ['철저함', '용맹함'], emoji: '💨' },
                { ego: '역동', parts: ['활력적', '용맹함'], emoji: '🌟' },
                { ego: '결의', parts: ['굳건함', '냉철함'], emoji: '❤️' },
                { ego: '추진', parts: ['굳건함', '활력적'], emoji: '💪' },
                { ego: '신념', parts: ['굳건함', '열정적'], emoji: '✨' },
                { ego: '완성', parts: ['굳건함', '철저함'], emoji: '💎' },
                { ego: '분석', parts: ['냉철함', '열정적'], emoji: '👁️' },
                { ego: '실행', parts: ['냉철함', '철저함'], emoji: '⏱️' },
                { ego: '정열', parts: ['활력적', '열정적'], emoji: '🔥' },
                { ego: '지배', parts: ['활력적', '철저함'], emoji: '❄️' },
              ];

              const traitEffectDesc = {
                '용맹함': '힘 +1',
                '굳건함': '체력 +10',
                '냉철함': '통찰 +1',
                '철저함': '보조슬롯 +1',
                '열정적': '속도 +5',
                '활력적': '행동력 +1',
              };

              const reflectionDesc = {
                '헌신': '공세 획득',
                '지략': '수세 획득',
                '추격': '흐릿함 획득',
                '역동': '행동력 +1',
                '결의': '체력 2% 회복',
                '추진': '힘 +1',
                '신념': '면역 +1',
                '완성': '에테르 1.5배',
                '분석': '통찰 +1',
                '실행': '타임라인 +5',
                '정열': '민첩 +1',
                '지배': '적 동결',
              };

              let previewEgo = null;
              let previewEmoji = '';
              let bestScore = 0;
              for (const { ego, parts, emoji } of egoRules) {
                const score = (traitCounts[parts[0]] || 0) + (traitCounts[parts[1]] || 0);
                if (score > bestScore) {
                  bestScore = score;
                  previewEgo = ego;
                  previewEmoji = emoji;
                }
              }

              // 효과 합산
              const effectSummary = {};
              for (const trait of selectedTraitNames) {
                const desc = traitEffectDesc[trait];
                if (desc) {
                  effectSummary[desc] = (effectSummary[desc] || 0) + 1;
                }
              }
              const effectText = Object.entries(effectSummary)
                .map(([effect, count]) => {
                  const match = effect.match(/(.+?)([+-]?\d+)/);
                  if (match) {
                    return `${match[1]}${parseInt(match[2]) * count > 0 ? '+' : ''}${parseInt(match[2]) * count}`;
                  }
                  return `${effect} x${count}`;
                })
                .join(', ');

              return (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(253, 230, 138, 0.1)", borderRadius: "8px", border: "1px solid rgba(253, 230, 138, 0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <strong style={{ color: "#fde68a" }}>✨ 자아 형성 - 개성 5개 선택</strong>
                  <span style={{ color: "#9ca3af" }}>선택: {selectedTraitsForEgo.length}/5</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {playerTraits.map((trait, idx) => {
                    const isSelected = selectedTraitsForEgo.includes(idx);
                    const canSelect = !isSelected && selectedTraitsForEgo.length < 5;
                    return (
                      <button
                        key={idx}
                        className="btn"
                        style={{
                          background: isSelected ? "rgba(253, 230, 138, 0.3)" : "rgba(30, 41, 59, 0.8)",
                          border: isSelected ? "2px solid #fde68a" : "1px solid #475569",
                          color: isSelected ? "#fde68a" : "#e2e8f0",
                          opacity: canSelect || isSelected ? 1 : 0.5,
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTraitsForEgo(prev => prev.filter(i => i !== idx));
                          } else if (canSelect) {
                            setSelectedTraitsForEgo(prev => [...prev, idx]);
                          }
                        }}
                      >
                        {trait}
                      </button>
                    );
                  })}
                </div>

                {/* 자아 미리보기 */}
                {selectedTraitsForEgo.length > 0 && (
                  <div style={{
                    marginBottom: "12px",
                    padding: "10px",
                    background: "rgba(15, 23, 42, 0.8)",
                    borderRadius: "6px",
                    border: previewEgo ? "1px solid rgba(134, 239, 172, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)"
                  }}>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>미리보기</div>
                    {previewEgo ? (
                      <>
                        <div style={{ fontSize: "16px", color: "#fde68a", fontWeight: "bold" }}>
                          {previewEmoji} {previewEgo}
                        </div>
                        <div style={{ fontSize: "13px", color: "#86efac", marginTop: "4px" }}>
                          효과: {effectText || '없음'}
                        </div>
                        <div style={{ fontSize: "13px", color: "#7dd3fc", marginTop: "2px" }}>
                          성찰: 매 턴 확률로 {reflectionDesc[previewEgo]}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: "14px", color: "#fbbf24" }}>
                        조합에 해당하는 자아 없음 (기본: 각성)
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="btn"
                    disabled={selectedTraitsForEgo.length !== 5}
                    onClick={() => {
                      const traitsToConsume = selectedTraitsForEgo.map(idx => playerTraits[idx]);
                      formEgo(traitsToConsume);
                      setEgoFormMode(false);
                      setSelectedTraitsForEgo([]);
                    }}
                    style={{ background: selectedTraitsForEgo.length === 5 ? "rgba(134, 239, 172, 0.2)" : undefined }}
                  >
                    자아 형성
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setEgoFormMode(false);
                      setSelectedTraitsForEgo([]);
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
              );
            })()}

            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn" onClick={() => { closeRest(); setEgoFormMode(false); setSelectedTraitsForEgo([]); }}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {activeBattle && <LegacyBattleScreen />}

      {activeDungeon && !activeDungeon.confirmed && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>⚠️ 던전 진입</h3>
            </header>
            <p style={{ marginBottom: "20px", lineHeight: "1.6" }}>
              위험한 던전이 앞에 있습니다. 던전 내부는 위험하지만 보상도 있습니다.
              <br />
              진입하시겠습니까?
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={confirmDungeon}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "2px solid #3498db",
                  background: "rgba(52, 152, 219, 0.2)",
                  color: "#3498db",
                  cursor: "pointer",
                }}
              >
                진입한다
              </button>
              <button
                type="button"
                onClick={bypassDungeon}
                style={{
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  border: "2px solid #95a5a6",
                  background: "rgba(149, 165, 166, 0.2)",
                  color: "#95a5a6",
                  cursor: "pointer",
                }}
              >
                지나친다
              </button>
            </div>
          </div>
        </div>
      )}

      {isDungeonExploring && (
        <div style={{ display: activeBattle ? 'none' : 'block' }}>
          <DungeonExploration />
        </div>
      )}

      {lastBattleResult && !lastBattleResult.nodeId.startsWith('dungeon-') && (
        <div className="battle-modal-overlay">
          <div className="battle-modal result">
            <h3>전투 결과</h3>
            <p>
              {lastBattleResult.label} / {lastBattleResult.kind.toUpperCase()}
            </p>
            <strong>{lastBattleResult.result === "victory" ? "승리" : "패배"}</strong>
            <p>보상: {formatApplied(lastBattleResult.rewards)}</p>
            {lastBattleResult.log?.length ? (
              <div className="timeline-preview">
                <strong>로그</strong>
                <ul>
                  {lastBattleResult.log.slice(0, 6).map((entry, index) => (
                    <li key={`log-${index}`}>{formatBattleLogEntry(entry)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button type="button" className="close-btn" onClick={clearBattleResult}>
              확인
            </button>
          </div>
        </div>
      )}

      {showCharacterSheet && <CharacterSheet onClose={() => actions.setShowCharacterSheet(false)} />}

      {/* 개발자 도구 오버레이 */}
      <DevTools isOpen={devToolsOpen} onClose={() => actions.setDevToolsOpen(false)} />
    </div>
  );
}

function RestUpgradePanel({ cardUpgrades, onUpgrade }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const cards = CARDS || [];
  const rarityOrder = ['common', 'rare', 'special', 'legendary'];
  const rarityLabel = {
    common: '일반',
    rare: '희귀',
    special: '특별',
    legendary: '전설',
  };
  const rarityBadge = {
    common: null,
    rare: { color: '#60a5fa', label: '희귀' },
    special: { color: '#34d399', label: '특별' },
    legendary: { color: '#fbbf24', label: '전설' },
  };

  const getNextRarity = (card) => {
    const current = cardUpgrades[card.id] || card.rarity || 'common';
    const idx = rarityOrder.indexOf(current);
    if (idx === -1 || idx >= rarityOrder.length - 1) return null;
    return rarityOrder[idx + 1];
  };

  const handleUpgrade = () => {
    const card = cards.find((c) => c.id === selectedCard);
    if (!card) return;
    const next = getNextRarity(card);
    if (!next) return;
    onUpgrade(card.id);
  };

  const selected = cards.find((c) => c.id === selectedCard);
  const currentRarity = selected ? (cardUpgrades[selected.id] || selected.rarity || 'common') : null;
  const nextRarity = selected ? getNextRarity(selected) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ fontWeight: 700 }}>카드 강화</div>
      <button className="btn" onClick={() => setShowModal(true)}>
        카드 선택
      </button>
      {selected && (
        <div style={{ fontSize: "13px", color: "#9ca3af" }}>
          현재 등급: {rarityLabel[currentRarity]} {nextRarity ? `→ 다음: ${rarityLabel[nextRarity]}` : '(최고 등급)'}
        </div>
      )}
      <button
        className="btn"
        onClick={handleUpgrade}
        disabled={!selected || !nextRarity}
      >
        강화하기
      </button>

      {showModal && (
        <div className="event-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
            <header>
              <h3>강화할 카드 선택</h3>
            </header>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
              {cards.map((card) => {
                const current = cardUpgrades[card.id] || card.rarity || 'common';
                const badge = rarityBadge[current];
                return (
                  <button
                    key={card.id}
                    className="choice-card"
                    style={{
                      textAlign: "left",
                      borderColor: selectedCard === card.id ? "#fbbf24" : "rgba(148,163,184,0.4)",
                      boxShadow: selectedCard === card.id ? "0 0 10px rgba(251,191,36,0.6)" : "none"
                    }}
                    onClick={() => setSelectedCard(card.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{card.name}</strong>
                      {badge && (
                        <span style={{
                          fontSize: "11px",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: badge.color,
                          color: "#0f172a",
                          fontWeight: 800
                        }}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
                      {card.description || ''}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>
                      행동력 {card.actionCost} · 속도 {card.speedCost} · 에테르 {CARD_ETHER_BY_RARITY[current]}
                    </div>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn" onClick={() => setShowModal(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
