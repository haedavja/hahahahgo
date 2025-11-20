      <aside className="legacy-pane">
        <div className="legacy-pane-header">
          <strong className="version-badge" style={{ fontSize: "1.55rem" }}>{PATCH_VERSION_TAG}</strong>
          <button type="button">�̺�Ʈ ����</button>
        </div>
        <ol>
          {asideItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <div className="patch-notes">
          <div className="patch-note-heading">Recent Patch</div>
          <div className="patch-note-body">
            <p>? Applied in Korea time 11-19 01:15.</p>
            <p>? Standardized the trait layout and keep those notes visible during respond/resolve.</p>
          </div>
        </div>

      </aside>

import { useGameStore } from "../../state/gameStore";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";
import { CharacterSheet } from "../character/CharacterSheet";
import { DungeonExploration } from "../dungeon/DungeonExploration";
import { LegacyBattleScreen } from "../battle/LegacyBattleScreen";

const NODE_WIDTH = 96;
const NODE_HEIGHT = 100;
const MAP_WIDTH = 960;
const MAP_LAYERS = 11;
const V_SPACING = 360;
const PRAYER_COSTS = [1, 3, 5];

const ICON_MAP = {
  battle: "??",
  elite: "?",
  shop: "??",
  event: "?",
  rest: "?",
  boss: "??",
  dungeon: "??",
};

const LEGEND = [
  { icon: "??", label: "����" },
  { icon: "?", label: "����" },
  { icon: "??", label: "����" },
  { icon: "?", label: "�߿�" },
  { icon: "?", label: "�̺�Ʈ" },
  { icon: "??", label: "����" },
  { icon: "??", label: "����" },
];

const RESOURCE_LABELS = {
  gold: "��",
  intel: "����",
  loot: "����ǰ",
  material: "������",
  etherPts: "���׸�",
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
  if (!entries.length) return "����";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${describeAmount(amount)}`).join(", ");
};

const describeCost = (cost = {}) => {
  const entries = Object.entries(cost || {});
  if (!entries.length) return "����";
  return entries.map(([key, amount]) => `${RESOURCE_LABELS[key] ?? key} ${amount}`).join(", ");
};

const formatApplied = (bundle = {}) => {
  const entries = Object.entries(bundle || {});
  if (!entries.length) return "����";
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
    entry.actor === "player" ? "�÷��̾�" : entry.actor === "enemy" ? "��" : entry.actor ?? "";
  const cardLabel = entry.name ?? entry.cardId ?? "�ൿ";
  const detail = entry.detail ?? {};

  if (detail.type === "attack") {
    const dmg = detail.hpDamage ?? 0;
    const blocked = detail.blocked ?? 0;
    return `${actorLabel} ${cardLabel} ����: ���� ${dmg}, ���� ${blocked}`;
  }
  if (detail.type === "block") {
    return `${actorLabel} ${cardLabel} ��� +${detail.block ?? 0}`;
  }
  if (detail.type === "support") {
    return `${actorLabel} ${cardLabel} ���� ȿ�� �ߵ�`;
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

<<<<<<< HEAD
const PATCH_VERSION_TAG = "11-17-10:00"; // 다음 패치마다 여기를 최신 시간(월-일-시:분, KST)으로 갱신하세요.

/* v11-16-14:45 갱신 내역
 * - 카드 스탯 폰트 크기 일원화 및 확대:
 *   - 선택/대응 단계 모두 text-sm → text-lg (14px → 18px)
 *   - 속도: 0.75rem/text-xs → 1.125rem/text-lg (12px → 18px)
 *   - 공격력, 방어력, 속도 숫자 모두 동일한 크기로 통일
 * - 속도/선택 텍스트 색상 변경: #94a3b8 → #7dd3fc (옅은 하늘색)
 * - 제출 버튼 아이콘 크기 조정: 20 → 18 (리드로우 버튼과 동일한 높이)
=======
const PATCH_VERSION_TAG = "11-16-13:40"; // Updated to Korea time 11-16 13:40

/* v11-16 13:40 patch notes
 * - Latest refresh for the ???? ????? preview and patch log.
 * - Keeps title, stage label, and log section consistent across phases.
 */
>>>>>>> 6fec72b (docs: update patch timestamp)
 */

export function MapDemo() {
  const map = useGameStore((state) => state.map);
  const resources = useGameStore((state) => state.resources);
  const mapRisk = useGameStore((state) => state.mapRisk);
  const activeEvent = useGameStore((state) => state.activeEvent);
  const activeBattle = useGameStore((state) => state.activeBattle);
  const activeDungeon = useGameStore((state) => state.activeDungeon);
  const lastBattleResult = useGameStore((state) => state.lastBattleResult);
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

  const [showCharacterSheet, setShowCharacterSheet] = useState(false);

  const nodes = map?.nodes ?? [];
  const mapViewRef = useRef(null);
  const riskDisplay = Number.isFinite(mapRisk) ? mapRisk.toFixed(1) : "-";
  const aetherValue = resources.etherPts ?? 0;
  const aetherSlots = calculateEtherSlots(aetherValue); // ���÷��̼� ����
  const aetherCurrentPts = getCurrentSlotPts(aetherValue); // ���� ���� ���� pt (���Ը��� 0���� ����)
  const aetherNextSlotCost = getNextSlotCost(aetherValue); // ���� ������ ä��µ� �ʿ��� �� pt
  const aetherProgress = getSlotProgress(aetherValue); // ���� ���Ա����� ����� (0-1)
  const aetherRatio = Math.max(0, Math.min(1, aetherProgress)); // �ð��� �� ����
  const aetherTier = `x${aetherSlots}`;

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

  const availablePrayers = useMemo(
    () => PRAYER_COSTS.filter((cost) => (resources.etherPts ?? 0) >= cost),
    [resources.etherPts],
  );

  const handleNodeClick = (node) => {
    if (!node || node.cleared || !node.selectable) return;
    selectNode(node.id);
  };

<<<<<<< HEAD
=======
  const asideItems = [
    "���� ���� ��� �α׿� '>>> ��ȯ�� ����' �ʵ� �߰�",
    "���� �ܰ� vs ���� �ܰ� ���� ���� �����",
    "������ ĳ�� ���� �ذ��� ���� ���� ���� ������Ʈ",
  ];

>>>>>>> 6fec72b (docs: update patch timestamp)
  return (
    <div className="app-shell">
      <header>
        <h1>�α׶���ũ ��� ����</h1>
        <small>�ӵ� �ý��� ���� �� React + Vite �ÿ�</small>
      </header>

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
                    node.selectable && !node.cleared ? "selectable" : "",
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

<<<<<<< HEAD
=======
      <aside className="legacy-pane">
        <div className="legacy-pane-header">
          <strong className="version-badge" style={{ fontSize: "1.55rem" }}>{PATCH_VERSION_TAG}</strong>
          <button type="button">���� ��ũ</button>
        </div>
        <ol>
          {asideItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <div className="patch-notes">
          <div className="patch-note-heading">Recent Patch</div>
          <div className="patch-note-body">
            <p>? Applied in Korea time 11-16 13:40.</p>
            <p>? Consolidated the ???? ????? UI across all stages and moved resolve logs into this preview panel.</p>
          </div>
        </div>

      </aside>

>>>>>>> 6fec72b (docs: update patch timestamp)
      <div className="resource-hud">
        <span className="resource-tag" style={{ color: "#fca5a5", fontWeight: "700" }}>
          HP: {playerHp} / {maxHp}
        </span>
        {Object.entries(resources)
          .filter(([key]) => key !== "etherPts")
          .map(([key, value]) => (
            <span key={key} className="resource-tag">
              {RESOURCE_LABELS[key] ?? key}: {value}
            </span>
          ))}
      </div>

      <div className="aether-column">
        <div className="aether-title">AETHER</div>
        <div className="aether-bar">
          <div className="aether-fill" style={{ height: `${aetherRatio * 100}%` }} />
        </div>
        <div className="aether-remaining">
          <div>{aetherCurrentPts}/{aetherNextSlotCost}</div>
          <div>{aetherTier}</div>
        </div>
      </div>

      <div className="risk-indicator">���赵 {riskDisplay}%</div>

      <div className="map-version-tag">{PATCH_VERSION_TAG}</div>

      {activeEvent && (
        <div className="event-modal-overlay">
          <div className="event-modal">
            <header>
              <h3>{activeEvent.definition?.title ?? "��Ȯ�� ���"}</h3>
              <small>��ȣ Ȯ�� {friendlyPercent(activeEvent.friendlyChance) ?? "���� ����"}</small>
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
                        <small>���: {describeCost(choice.cost)}</small>
                        <small>����: {describeBundle(choice.rewards)}</small>
                        <small>�г�Ƽ: {describeBundle(choice.penalty)}</small>
                        <button type="button" disabled={!affordable} onClick={() => chooseEvent(choice.id)}>
                          ����
                        </button>
                      </div>
                    );
                  })}
                </div>

                {availablePrayers.length > 0 && (
                  <div className="event-choices">
                    <strong>�⵵ (���׸� ���)</strong>
                    {availablePrayers.map((cost) => (
                      <div key={`prayer-${cost}`} className="choice-card">
                        <strong>�⵵ x{cost}</strong>
                        <p>���׸��� �Ҹ��� ��ȣ�� ����� �����մϴ�.</p>
                        <small>���: ���׸� {cost}</small>
                        <small>����: ���� ȹ�� + ����ȭ</small>
                        <button type="button" onClick={() => invokePrayer(cost)}>
                          �⵵�Ѵ�
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
                <p>{activeEvent.outcome.success ? "��ȣ�� ó��" : "���ȣ�� ó��"}</p>
                <p>{activeEvent.outcome.text}</p>
                <p>�Ҹ�: {formatApplied(Object.fromEntries(Object.entries(activeEvent.outcome.cost || {}).map(([k, v]) => [k, -v])))}</p>
                <p>ȹ��: {formatApplied(activeEvent.outcome.rewards)}</p>
                <p>�ս�: {formatApplied(activeEvent.outcome.penalty)}</p>
                <button type="button" className="close-btn" onClick={closeEvent}>
                  Ȯ��
                </button>
              </div>
            )}
          </div>
        </div>
      )}

<<<<<<< HEAD
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
=======
      {activeDungeon && (
        <div className="dungeon-modal-overlay">
          <div className="dungeon-modal">
            <h3>���� ���</h3>
            <p className="dungeon-warning">�̰������� £�� ������ ������ ���ϴ�. ������ ������ ���������� ������ ���� ��ƽ��ϴ�.</p>
            <p className="dungeon-warning">�������� ������ ���з� ���� �� ������ �����ϼ���.</p>

            <div className="dungeon-info">
              <strong>�Ը� �� ����</strong>
              {activeDungeon.revealed ? (
                <>
                  <p>�Ը�: {activeDungeonNode?.dungeonData?.size ?? "��Ȯ��"}</p>
                  <p>����: {activeDungeonNode?.dungeonData?.type ?? "��Ȯ��"}</p>
                </>
              ) : (
                <>
                  <p>������ �����ϸ� ������ �ľ��� �� �ֽ��ϴ�.</p>
                  <button type="button" onClick={revealDungeonInfo} disabled={(resources.intel ?? 0) < 2}>
                    ���� �ر� (���� 2)
                  </button>
                </>
              )}
            </div>

            <div className="dungeon-actions">
              <button type="button" className="skip" onClick={skipDungeon}>
                �׳� ����ģ��
              </button>
              <button type="button" className="enter" onClick={enterDungeon}>
                �����Ѵ�
>>>>>>> 6fec72b (docs: update patch timestamp)
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDungeon && activeDungeon.confirmed && !activeBattle && <DungeonExploration key={activeDungeon.nodeId} />}

      {lastBattleResult && !lastBattleResult.nodeId.startsWith('dungeon-') && (
        <div className="battle-modal-overlay">
          <div className="battle-modal result">
            <h3>���� ���</h3>
            <p>
              {lastBattleResult.label} / {lastBattleResult.kind.toUpperCase()}
            </p>
            <strong>{lastBattleResult.result === "victory" ? "�¸�" : "�й�"}</strong>
            <p>����: {formatApplied(lastBattleResult.rewards)}</p>
            {lastBattleResult.log?.length ? (
              <div className="timeline-preview">
                <strong>�α�</strong>
                <ul>
                  {lastBattleResult.log.slice(0, 6).map((entry, index) => (
                    <li key={`log-${index}`}>{formatBattleLogEntry(entry)}</li>
                  ))}
               </ul>
             </div>
           ) : null}
            <button type="button" className="close-btn" onClick={clearBattleResult}>
              Ȯ��
            </button>
          </div>
        </div>
      )}

      {showCharacterSheet && <CharacterSheet onClose={() => setShowCharacterSheet(false)} />}
    </div>
  );
}


