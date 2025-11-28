import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { DungeonExploration } from "../dungeon/DungeonExploration";
import { LegacyBattleScreen } from "../battle/LegacyBattleScreen";
import { EtherBar } from "../battle/LegacyBattleApp";
import { DevTools } from "../dev/DevTools";
import { RELICS, RELIC_RARITIES } from "../../data/relics";
import { applyNodeMoveEther } from "../../lib/relicEffects";

// 유물 희귀도별 색상
const RELIC_RARITY_COLORS = {
  [RELIC_RARITIES.COMMON]: '#94a3b8',
  [RELIC_RARITIES.RARE]: '#60a5fa',
  [RELIC_RARITIES.SPECIAL]: '#a78bfa',
  [RELIC_RARITIES.LEGENDARY]: '#fbbf24',
};

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
  Object.entries(cost).every(([key, value]) => (resources[key] ?? 0) >= value);

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

const PATCH_VERSION_TAG = "11-28-18:35"; // 다음 패치마다 여기를 최신 시간(월-일-시-분, KST)으로 갱신하세요.

/* v11-25-19:33 갱신 내역
 * - 카드 스탯 폰트 크기 일원화 및 확대:
 *   - 선택/대응 단계 모두 text-sm → text-lg (14px → 18px)
 *   - 속도: 0.75rem/text-xs → 1.125rem/text-lg (12px → 18px)
 *   - 공격력, 방어력, 속도 숫자 모두 동일한 크기로 통일
 * - 속도/선택 텍스트 색상 변경: #94a3b8 → #7dd3fc (옅은 하늘색)
 * - 제출 버튼 아이콘 크기 조정: 20 → 18 (리드로우 버튼과 동일한 높이)
 */

export function MapDemo() {
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [isDungeonExploring, setIsDungeonExploring] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [hoveredRelic, setHoveredRelic] = useState(null);

  const map = useGameStore((state) => state.map);
  const resources = useGameStore((state) => state.resources || {});
  const mapRisk = useGameStore((state) => state.mapRisk);
  const activeEvent = useGameStore((state) => state.activeEvent);
  const activeBattle = useGameStore((state) => state.activeBattle);
  const activeDungeon = useGameStore((state) => state.activeDungeon);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
  const relics = useGameStore((state) => state.relics);
  const mergeRelicOrder = useCallback((relicList = [], saved = []) => {
    const savedSet = new Set(saved);
    const merged = [];
    saved.forEach(id => { if (relicList?.includes(id)) merged.push(id); });
    (relicList || []).forEach(id => { if (!savedSet.has(id)) merged.push(id); });
    return merged;
  }, []);
  const [orderedRelics, setOrderedRelics] = useState(() => {
    try {
      const saved = localStorage.getItem("relicOrder");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics || [], ids);
      }
    } catch {}
    return relics || [];
  });
  const dragRelicIndexRef = useRef(null);
  const [relicActivated, setRelicActivated] = useState(null);
  useEffect(() => {
    // 새 유물 추가/제거 시 순서를 유지하면서 병합
    setOrderedRelics((prev) => {
      return mergeRelicOrder(relics || [], prev);
    });
  }, [relics, mergeRelicOrder]);
  useEffect(() => {
    try {
      localStorage.setItem("relicOrder", JSON.stringify(orderedRelics));
    } catch {}
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

  // Alt+D 핫키로 DevTools 토글
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setDevToolsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nodes = map?.nodes ?? [];
  const mapViewRef = useRef(null);
  const riskDisplay = Number.isFinite(mapRisk) ? mapRisk.toFixed(1) : "-";
  const aetherValue = resources.etherPts ?? 0;
  const aetherSlots = calculateEtherSlots(aetherValue); // 인플레이션 적용
  const aetherCurrentPts = getCurrentSlotPts(aetherValue); // 현재 슬롯 내의 pt (슬롯마다 0으로 리셋)
  const aetherNextSlotCost = getNextSlotCost(aetherValue); // 다음 슬롯을 채우는데 필요한 총 pt
  const aetherProgress = getSlotProgress(aetherValue); // 다음 슬롯까지의 진행률 (0-1)
  const aetherRatio = Math.max(0, Math.min(1, aetherProgress)); // 시각적 바 높이
  const aetherTier = `x${aetherSlots}`;
  const hpRatio = Math.max(0, Math.min(1, playerHp / maxHp)); // HP 비율
  const hpColor = hpRatio > 0.5 ? "#86efac" : hpRatio > 0.25 ? "#fde047" : "#fca5a5";

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
        setShowCharacterSheet((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  // 던전 탐험 상태 관리
  useEffect(() => {
    if (activeDungeon?.confirmed) {
      // 던전 진입 확정 시 탐험 시작
      setIsDungeonExploring(true);
    } else if (!activeDungeon) {
      // activeDungeon이 사라졌을 때
      if (!activeBattle) {
        // 전투 중이 아니면 즉시 탐험 종료 (탈출/완료)
        setIsDungeonExploring(false);
      }
      // 전투 중이면 그대로 유지 (던전 내 전투)
    }
  }, [activeDungeon, activeBattle]);

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
          zIndex: 100,
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
                    setRelicActivated(relicId);
                    e.dataTransfer.effectAllowed = 'move';
                    try {
                      const img = new Image();
                      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    } catch {}
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = dragRelicIndexRef.current;
                    dragRelicIndexRef.current = null;
                    setRelicActivated(null);
                    if (from === null || from === index) return;
                    const next = Array.from(orderedRelics);
                    const [item] = next.splice(from, 1);
                    next.splice(index, 0, item);
                    setOrderedRelics(next);
                  }}
                  onMouseDown={() => {
                    setRelicActivated(prev => prev === relicId ? null : relicId);
                  }}
                >
                  <div
                    onMouseEnter={() => setHoveredRelic(relicId)}
                    onMouseLeave={() => setHoveredRelic(null)}
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

      <div className="main-layout">
        <div className="map-container">
          <div className="map-view" ref={mapViewRef} style={{marginLeft: '400px'}}>
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

      <div className="resources-display">
        <div style={{ color: "#ffd700", fontSize: "13px" }}>금: {resources.gold}</div>
        <div style={{ color: "#9da9d6", fontSize: "13px" }}>정보: {resources.intel}</div>
        <div style={{ color: "#ff6b6b", fontSize: "13px" }}>전리품: {resources.loot}</div>
        <div style={{ color: "#a0e9ff", fontSize: "13px" }}>원자재: {resources.material}</div>
      </div>

      <div className="map-version-tag">{PATCH_VERSION_TAG}</div>

      {activeEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>{activeEvent.definition?.title ?? "미확인 사건"}</h3>
              <small>우호 확률 {friendlyPercent(activeEvent.friendlyChance) ?? "정보 없음"}</small>
            </header>
            <p>{activeEvent.definition?.description}</p>

            {!activeEvent.resolved && (
              <>
                <div className="event-choices">
                  {activeEvent.definition?.choices?.map((choice) => {
                    const affordable = canAfford(resources, choice.cost || {});
                    return (
                      <div key={choice.id} className="choice-card">
                        <strong>{choice.label}</strong>
                        <p>{choice.detail}</p>
                        <small>비용: {describeCost(choice.cost)}</small>
                        <small>보상: {describeBundle(choice.rewards)}</small>
                        <small>패널티: {describeBundle(choice.penalty)}</small>
                        <button type="button" disabled={!affordable} onClick={() => chooseEvent(choice.id)}>
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
                <strong>{activeEvent.outcome.choice}</strong>
                <p>{activeEvent.outcome.success ? "우호적 처리" : "비우호적 처리"}</p>
                <p>{activeEvent.outcome.text}</p>
                <p>소모: {formatApplied(Object.fromEntries(Object.entries(activeEvent.outcome.cost || {}).map(([k, v]) => [k, -v])))}</p>
                <p>획득: {formatApplied(activeEvent.outcome.rewards)}</p>
                <p>손실: {formatApplied(activeEvent.outcome.penalty)}</p>
                <button type="button" className="close-btn" onClick={closeEvent}>
                  확인
                </button>
              </div>
            )}
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

      {showCharacterSheet && <CharacterSheet onClose={() => setShowCharacterSheet(false)} />}

      {/* 개발자 도구 오버레이 */}
      <DevTools isOpen={devToolsOpen} onClose={() => setDevToolsOpen(false)} />
    </div>
  );
}
