/**
 * @file StatsWidget.tsx
 * @description 게임 우측 상단 통계 버튼 위젯 - 전체 통계 표시
 */

import { useState, useCallback, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { getCurrentStats, getDetailedStats } from '../../../simulator/bridge/stats-bridge';
import { analyzeStats } from '../../../simulator/analysis/stats-analysis-framework';
import { BalanceInsightAnalyzer } from '../../../simulator/analysis/balance-insights';

type TabType = 'battle' | 'monster' | 'card' | 'relic' | 'combo' | 'shop' | 'event' | 'record' | 'dungeon' | 'item' | 'growth' | 'advanced';

const WIDGET_STYLE: CSSProperties = {
  position: 'fixed',
  top: '12px',
  right: '12px',
  zIndex: 9999,
};

const BUTTON_STYLE: CSSProperties = {
  padding: '8px 12px',
  background: 'rgba(30, 41, 59, 0.95)',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const MODAL_OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  zIndex: 10000,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const MODAL_CONTENT_STYLE: CSSProperties = {
  background: '#1e293b',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '700px',
  maxHeight: '85vh',
  overflow: 'auto',
  color: '#e2e8f0',
  minWidth: '500px',
};

const TAB_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  gap: '4px',
  marginBottom: '16px',
  flexWrap: 'wrap',
};

const TAB_STYLE: CSSProperties = {
  padding: '6px 12px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold',
};

const STAT_ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #334155',
};

const STAT_LABEL_STYLE: CSSProperties = {
  color: '#94a3b8',
};

const STAT_VALUE_STYLE: CSSProperties = {
  fontWeight: 'bold',
  color: '#fbbf24',
};

const SECTION_TITLE_STYLE: CSSProperties = {
  margin: '16px 0 8px',
  fontSize: '14px',
};

const COPY_BUTTON_STYLE: CSSProperties = {
  marginTop: '16px',
  padding: '10px 20px',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  width: '100%',
};

const CLOSE_BUTTON_STYLE: CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  fontSize: '20px',
  cursor: 'pointer',
};

const TABS: { id: TabType; label: string; emoji: string }[] = [
  { id: 'battle', label: '전투', emoji: '⚔️' },
  { id: 'monster', label: '몬스터', emoji: '👾' },
  { id: 'card', label: '카드', emoji: '🃏' },
  { id: 'relic', label: '상징', emoji: '💎' },
  { id: 'combo', label: '콤보', emoji: '🎯' },
  { id: 'shop', label: '상점', emoji: '🛒' },
  { id: 'event', label: '이벤트', emoji: '📜' },
  { id: 'dungeon', label: '던전', emoji: '🏰' },
  { id: 'item', label: '아이템', emoji: '🎒' },
  { id: 'growth', label: '성장', emoji: '📈' },
  { id: 'record', label: '기록', emoji: '🏆' },
  { id: 'advanced', label: '분석', emoji: '🔍' },
];

export const StatsWidget = memo(function StatsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('battle');

  const stats = getCurrentStats();
  const detailed = getDetailedStats();

  const handleCopy = useCallback(() => {
    const text = formatAllStatsForCopy(stats, detailed);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [stats, detailed]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div style={WIDGET_STYLE}>
      <button
        onClick={() => setIsOpen(true)}
        style={BUTTON_STYLE}
        title="게임 통계 보기"
      >
        <span>📊</span>
        <span>{stats.wins}승 {stats.losses}패</span>
      </button>

      {isOpen && (
        <div style={MODAL_OVERLAY_STYLE} onClick={handleClose}>
          <div
            style={{ ...MODAL_CONTENT_STYLE, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button style={CLOSE_BUTTON_STYLE} onClick={handleClose}>✕</button>

            <h2 style={{ margin: '0 0 16px', color: '#22c55e' }}>📊 게임 통계</h2>

            {/* 탭 네비게이션 */}
            <div style={TAB_CONTAINER_STYLE}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...TAB_STYLE,
                    background: activeTab === tab.id ? '#3b82f6' : '#475569',
                    color: activeTab === tab.id ? '#fff' : '#94a3b8',
                  }}
                >
                  {tab.emoji} {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'battle' && <BattleTab stats={stats} />}
            {activeTab === 'monster' && <MonsterTab detailed={detailed} />}
            {activeTab === 'card' && <CardTab detailed={detailed} />}
            {activeTab === 'relic' && <RelicTab detailed={detailed} />}
            {activeTab === 'combo' && <ComboTab detailed={detailed} />}
            {activeTab === 'shop' && <ShopTab detailed={detailed} />}
            {activeTab === 'event' && <EventTab detailed={detailed} />}
            {activeTab === 'dungeon' && <DungeonTab detailed={detailed} />}
            {activeTab === 'item' && <ItemTab detailed={detailed} />}
            {activeTab === 'growth' && <GrowthTab detailed={detailed} />}
            {activeTab === 'record' && <RecordTab detailed={detailed} stats={stats} />}
            {activeTab === 'advanced' && <AdvancedTab detailed={detailed} />}

            <button onClick={handleCopy} style={COPY_BUTTON_STYLE}>
              {copied ? '✅ 복사됨!' : '📋 전체 통계 복사하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ==================== 탭 컴포넌트들 ====================

function BattleTab({ stats }: { stats: ReturnType<typeof getCurrentStats> }) {
  const winRate = stats.battles > 0 ? ((stats.wins / stats.battles) * 100).toFixed(1) : '0';
  const soulRate = stats.wins > 0 ? ((stats.soulDestructions / stats.wins) * 100).toFixed(1) : '0';
  const physRate = stats.wins > 0 ? ((stats.physicalDestructions / stats.wins) * 100).toFixed(1) : '0';

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#22c55e' }}>⚔️ 전투 통계</h3>
      <StatRow label="총 전투" value={`${stats.battles}회`} />
      <StatRow
        label="승리 / 패배"
        value={
          <span>
            <span style={{ color: '#22c55e' }}>{stats.wins}</span>
            {' / '}
            <span style={{ color: '#ef4444' }}>{stats.losses}</span>
          </span>
        }
      />
      <StatRow
        label="승률"
        value={`${winRate}%`}
        valueColor={Number(winRate) >= 50 ? '#22c55e' : '#ef4444'}
      />
      <StatRow label="평균 턴" value={stats.avgTurns.toFixed(1)} />
      <StatRow label="평균 가한 피해" value={stats.avgDamageDealt.toFixed(1)} />
      <StatRow label="평균 받은 피해" value={stats.avgDamageTaken.toFixed(1)} />
      <StatRow label="총 가한 피해" value={stats.totalDamageDealt.toLocaleString()} />

      {stats.wins > 0 && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#a855f7' }}>💀 승리 방식</h3>
          <StatRow
            label="영혼파괴 (에테르)"
            value={`${stats.soulDestructions}회 (${soulRate}%)`}
            valueColor="#a855f7"
          />
          <StatRow
            label="육체파괴 (HP)"
            value={`${stats.physicalDestructions}회 (${physRate}%)`}
            valueColor="#ef4444"
          />
        </>
      )}

      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#3b82f6' }}>🏃 런 통계</h3>
      <StatRow label="총 런" value={`${stats.totalRuns}회`} />
      <StatRow label="클리어" value={`${stats.successfulRuns}회`} valueColor="#22c55e" />
    </>
  );
}

function MonsterTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const monsters = useMemo(() => {
    if (!detailed.monsterStats || detailed.monsterStats.size === 0) return [];
    return Array.from(detailed.monsterStats.entries())
      .sort((a, b) => (b[1].battles || 0) - (a[1].battles || 0));
  }, [detailed.monsterStats]);

  if (monsters.length === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 몬스터 통계가 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f97316' }}>👾 몬스터별 통계</h3>
      {monsters.map(([id, data]) => {
        const battleCount = data.battles || 0;
        const winRate = battleCount > 0 ? ((data.wins / battleCount) * 100).toFixed(1) : '0';
        const displayName = data.monsterName || id;
        const isBoss = data.isBoss;

        return (
          <div key={id} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={STAT_LABEL_STYLE}>
                {isBoss ? '👑 ' : ''}{displayName}
              </span>
              <span style={{ ...STAT_VALUE_STYLE, color: Number(winRate) >= 50 ? '#22c55e' : '#ef4444' }}>
                {battleCount}전 {data.wins}승 ({winRate}%)
              </span>
            </div>
            {battleCount > 0 && (
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                평균 {(data.avgTurns || 0).toFixed(1)}턴 | 가한 피해 {(data.avgDamageDealt || 0).toFixed(0)} | 받은 피해 {(data.avgDamageTaken || 0).toFixed(0)}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function CardTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const cards = useMemo(() => {
    if (!detailed.cardDeepStats || detailed.cardDeepStats.size === 0) return [];
    return Array.from(detailed.cardDeepStats.entries())
      .filter(([, data]) => (data.timesPlayed || 0) > 0)
      .sort((a, b) => (b[1].timesPlayed || 0) - (a[1].timesPlayed || 0))
      .slice(0, 20);
  }, [detailed.cardDeepStats]);

  if (cards.length === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 카드 사용 통계가 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#06b6d4' }}>🃏 카드 사용 통계 (상위 20)</h3>
      {cards.map(([id, data]) => {
        const winRate = data.winRateWith !== undefined ? (data.winRateWith * 100).toFixed(1) : '-';
        return (
          <div key={id} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={STAT_LABEL_STYLE}>{data.cardName || id}</span>
              <span style={STAT_VALUE_STYLE}>{data.timesPlayed || 0}회 사용</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              전투당 평균 {(data.avgPlaysPerBattle || 0).toFixed(1)}회 | 보유 시 승률 {winRate}%
              {data.avgDamageDealt ? ` | 평균 피해 ${data.avgDamageDealt.toFixed(0)}` : ''}
            </div>
          </div>
        );
      })}

      {/* 카드 픽률 */}
      {detailed.cardPickStats && Object.keys(detailed.cardPickStats).length > 0 && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#8b5cf6' }}>📥 카드 픽률 (상위 10)</h3>
          {Object.entries(detailed.cardPickStats)
            .filter(([, data]) => (data as { timesOffered?: number }).timesOffered && (data as { timesOffered: number }).timesOffered > 0)
            .sort((a, b) => {
              const aRate = ((a[1] as { timesPicked?: number; timesOffered?: number }).timesPicked || 0) / ((a[1] as { timesOffered?: number }).timesOffered || 1);
              const bRate = ((b[1] as { timesPicked?: number; timesOffered?: number }).timesPicked || 0) / ((b[1] as { timesOffered?: number }).timesOffered || 1);
              return bRate - aRate;
            })
            .slice(0, 10)
            .map(([cardId, data]) => {
              const d = data as { timesPicked?: number; timesOffered?: number };
              const pickRate = d.timesOffered ? ((d.timesPicked || 0) / d.timesOffered * 100).toFixed(1) : '0';
              return (
                <StatRow
                  key={cardId}
                  label={cardId}
                  value={`${d.timesPicked || 0}/${d.timesOffered || 0} (${pickRate}%)`}
                />
              );
            })}
        </>
      )}
    </>
  );
}

function RelicTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const relics = useMemo(() => {
    if (!detailed.relicStats || detailed.relicStats.size === 0) return [];
    return Array.from(detailed.relicStats.entries())
      .sort((a, b) => (b[1].timesAcquired || 0) - (a[1].timesAcquired || 0));
  }, [detailed.relicStats]);

  if (relics.length === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 상징 통계가 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#ec4899' }}>💎 상징 통계</h3>
      {relics.map(([id, data]) => {
        const contribution = data.contribution !== undefined ? data.contribution : 0;
        const contributionColor = contribution > 0 ? '#22c55e' : contribution < 0 ? '#ef4444' : '#94a3b8';
        return (
          <div key={id} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={STAT_LABEL_STYLE}>{data.relicName || id}</span>
              <span style={STAT_VALUE_STYLE}>{data.timesAcquired || 0}회 획득</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              보유 시 승률 {((data.winRateWith || 0) * 100).toFixed(1)}%
              <span style={{ color: contributionColor }}>
                {' '}({contribution >= 0 ? '+' : ''}{(contribution * 100).toFixed(1)}%p)
              </span>
              {data.avgAcquireFloor !== undefined && ` | 평균 획득 ${data.avgAcquireFloor.toFixed(1)}층`}
            </div>
          </div>
        );
      })}
    </>
  );
}

function ComboTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const comboDetails = detailed.pokerComboStats?.comboDetails;

  if (!comboDetails || Object.keys(comboDetails).length === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 콤보 통계가 없습니다.</p>;
  }

  const sortedCombos = Object.entries(comboDetails)
    .sort((a, b) => (b[1].totalOccurrences || 0) - (a[1].totalOccurrences || 0));

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f59e0b' }}>🎯 포커 콤보 통계</h3>
      {sortedCombos.map(([comboName, data]) => {
        const winRate = data.totalOccurrences > 0
          ? ((data.inWins / data.totalOccurrences) * 100).toFixed(1)
          : '0';
        return (
          <div key={comboName} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={STAT_LABEL_STYLE}>{comboName}</span>
              <span style={STAT_VALUE_STYLE}>{data.totalOccurrences}회 발동</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              승리 시 {data.inWins}회 | 승률 {winRate}%
              | 평균 에테르 {(data.avgEtherGained || 0).toFixed(1)}
            </div>
          </div>
        );
      })}

      {/* 토큰 통계 */}
      {detailed.tokenStats && detailed.tokenStats.size > 0 && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#14b8a6' }}>🔮 토큰 통계</h3>
          {Array.from(detailed.tokenStats.entries())
            .sort((a, b) => (b[1].timesAcquired || 0) - (a[1].timesAcquired || 0))
            .slice(0, 10)
            .map(([tokenId, data]) => (
              <StatRow
                key={tokenId}
                label={data.tokenName || tokenId}
                value={`${data.timesAcquired || 0}회 획득 / ${data.timesUsed || 0}회 사용`}
              />
            ))}
        </>
      )}
    </>
  );
}

function ShopTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const shopStats = detailed.shopStats;

  if (!shopStats || shopStats.totalVisits === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 상점 방문 기록이 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#a855f7' }}>🛒 상점 통계</h3>
      <StatRow label="총 방문" value={`${shopStats.totalVisits}회`} />
      <StatRow label="총 지출" value={`${shopStats.totalSpent?.toLocaleString() ?? 0}G`} />
      <StatRow label="평균 지출" value={`${((shopStats.avgSpentPerVisit ?? 0)).toFixed(0)}G/회`} />
      <StatRow label="카드 제거" value={`${shopStats.cardsRemoved ?? 0}회`} />

      {shopStats.relicsPurchased && Object.keys(shopStats.relicsPurchased).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>구매한 상징</h4>
          {Object.entries(shopStats.relicsPurchased as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => (
              <StatRow key={id} label={id} value={`${count}회`} />
            ))}
        </>
      )}

      {shopStats.itemsPurchased && Object.keys(shopStats.itemsPurchased).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>구매한 아이템</h4>
          {Object.entries(shopStats.itemsPurchased as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([id, count]) => (
              <StatRow key={id} label={id} value={`${count}회`} />
            ))}
        </>
      )}
    </>
  );
}

function EventTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const eventStats = detailed.eventStats;

  if (!eventStats || eventStats.size === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 이벤트 기록이 없습니다.</p>;
  }

  const sortedEvents = Array.from(eventStats.entries())
    .sort((a, b) => (b[1].occurrences || 0) - (a[1].occurrences || 0));

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f59e0b' }}>📜 이벤트 통계</h3>
      {sortedEvents.map(([id, data]) => {
        const successRate = data.occurrences > 0
          ? ((data.successes / data.occurrences) * 100).toFixed(1)
          : '0';
        return (
          <div key={id} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={STAT_LABEL_STYLE}>{data.eventName || id}</span>
              <span style={STAT_VALUE_STYLE}>{data.occurrences}회 발생</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              성공률 {successRate}% | 성공 {data.successes}회
            </div>
          </div>
        );
      })}
    </>
  );
}

function RecordTab({ detailed, stats }: { detailed: ReturnType<typeof getDetailedStats>; stats: ReturnType<typeof getCurrentStats> }) {
  const records = detailed.recordStats;
  const deathStats = detailed.deathStats;

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#fbbf24' }}>🏆 최고 기록</h3>
      {records ? (
        <>
          <StatRow label="최장 연승" value={`${records.longestWinStreak || 0}연승`} valueColor="#22c55e" />
          <StatRow label="최대 단일 턴 피해" value={(records.maxSingleTurnDamage || 0).toLocaleString()} />
          <StatRow label="최빠른 클리어" value={records.fastestClear ? `${records.fastestClear}턴` : '-'} />
          <StatRow label="최대 덱 크기 클리어" value={records.largestDeckClear ? `${records.largestDeckClear}장` : '-'} />
          <StatRow label="최대 보유 골드" value={(records.maxGoldHeld || 0).toLocaleString()} />
        </>
      ) : (
        <p style={{ color: '#94a3b8' }}>아직 기록이 없습니다.</p>
      )}

      {/* 사망 분석 */}
      {deathStats && deathStats.totalDeaths > 0 && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#ef4444' }}>💀 사망 분석</h3>
          <StatRow label="총 사망" value={`${deathStats.totalDeaths}회`} valueColor="#ef4444" />
          <StatRow label="평균 사망 층" value={(deathStats.avgDeathFloor || 0).toFixed(1)} />

          {deathStats.deadliestEnemies && deathStats.deadliestEnemies.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>가장 위험한 적</h4>
              {deathStats.deadliestEnemies.slice(0, 5).map((enemy: { enemyId: string; deaths: number }, idx: number) => (
                <StatRow
                  key={enemy.enemyId}
                  label={`${idx + 1}. ${enemy.enemyId}`}
                  value={`${enemy.deaths}회 사망`}
                  valueColor="#ef4444"
                />
              ))}
            </>
          )}

          {deathStats.deathsByCause && Object.keys(deathStats.deathsByCause).length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>사망 원인</h4>
              {Object.entries(deathStats.deathsByCause as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([cause, count]) => (
                  <StatRow key={cause} label={translateDeathCause(cause)} value={`${count}회`} />
                ))}
            </>
          )}
        </>
      )}

      {/* 런 진행 통계 */}
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#3b82f6' }}>📈 런 통계</h3>
      <StatRow label="총 런" value={`${stats.totalRuns}회`} />
      <StatRow label="클리어" value={`${stats.successfulRuns}회`} valueColor="#22c55e" />
      <StatRow
        label="클리어율"
        value={stats.totalRuns > 0 ? `${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%` : '-'}
        valueColor="#22c55e"
      />
      {detailed.runStats && (
        <>
          <StatRow label="평균 도달 층" value={(detailed.runStats.avgLayerReached || 0).toFixed(1)} />
          <StatRow label="평균 전투 승리" value={(detailed.runStats.avgBattlesWon || 0).toFixed(1)} />
          <StatRow label="평균 골드 획득" value={`${(detailed.runStats.avgGoldEarned || 0).toFixed(0)}G`} />
          <StatRow label="평균 덱 크기" value={`${(detailed.runStats.avgFinalDeckSize || 0).toFixed(1)}장`} />
          <StatRow label="평균 상징 수" value={`${(detailed.runStats.avgFinalRelicCount || 0).toFixed(1)}개`} />
        </>
      )}

      {/* 사망 원인 통계 */}
      {detailed.runStats?.deathCauses && Object.keys(detailed.runStats.deathCauses).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>사망 원인</h4>
          {Object.entries(detailed.runStats.deathCauses as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([cause, count]) => {
              const rate = stats.totalRuns > 0 ? ((count / stats.totalRuns) * 100).toFixed(1) : '0';
              return (
                <StatRow
                  key={cause}
                  label={cause}
                  value={`${count}회 (${rate}%)`}
                  valueColor="#ef4444"
                />
              );
            })}
        </>
      )}
    </>
  );
}

function DungeonTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const dungeonStats = detailed.dungeonStats;

  if (!dungeonStats || dungeonStats.totalAttempts === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 던전 기록이 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f97316' }}>🏰 던전 통계</h3>
      <StatRow label="총 진입" value={`${dungeonStats.totalAttempts ?? 0}회`} />
      <StatRow label="클리어율" value={`${((dungeonStats.clearRate ?? 0) * 100).toFixed(1)}%`} />
      <StatRow label="평균 소요 턴" value={(dungeonStats.avgTurns ?? 0).toFixed(1)} />
      <StatRow label="평균 받은 피해" value={(dungeonStats.avgDamageTaken ?? 0).toFixed(1)} />

      {dungeonStats.rewards && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>획득 보상</h4>
          <StatRow label="카드" value={`${dungeonStats.rewards.cards?.length ?? 0}장`} />
          <StatRow label="상징" value={`${dungeonStats.rewards.relics?.length ?? 0}개`} />
        </>
      )}
    </>
  );
}

function ItemTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const itemStats = detailed.itemUsageStats;

  if (!itemStats || Object.keys(itemStats.itemsAcquired || {}).length === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 아이템 기록이 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#84cc16' }}>🎒 아이템 획득</h3>
      {Object.entries(itemStats.itemsAcquired || {})
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([id, count]) => (
          <StatRow key={id} label={id} value={`${count}개`} />
        ))}

      {itemStats.itemEffects && Object.keys(itemStats.itemEffects).length > 0 && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#06b6d4' }}>💊 아이템 효과</h3>
          {Object.entries(itemStats.itemEffects)
            .sort((a, b) => (b[1] as { timesUsed?: number }).timesUsed ?? 0 - ((a[1] as { timesUsed?: number }).timesUsed ?? 0))
            .map(([id, eff]) => {
              const effect = eff as { timesUsed?: number; totalHpHealed?: number; totalDamage?: number };
              return (
                <div key={id} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={STAT_LABEL_STYLE}>{id}</span>
                    <span style={STAT_VALUE_STYLE}>{effect.timesUsed ?? 0}회 사용</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    HP회복 {effect.totalHpHealed ?? 0} | 피해 {effect.totalDamage ?? 0}
                  </div>
                </div>
              );
            })}
        </>
      )}
    </>
  );
}

function GrowthTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const growthStats = detailed.growthStats;

  if (!growthStats || growthStats.totalInvestments === 0) {
    return <p style={{ color: '#94a3b8' }}>아직 성장 기록이 없습니다.</p>;
  }

  return (
    <>
      <h3 style={{ ...SECTION_TITLE_STYLE, color: '#14b8a6' }}>📈 성장 통계</h3>
      <StatRow label="총 투자" value={`${growthStats.totalInvestments ?? 0}회`} />
      <StatRow label="런당 평균" value={`${(growthStats.avgInvestmentsPerRun ?? 0).toFixed(1)}회`} />

      {growthStats.statInvestments && Object.keys(growthStats.statInvestments).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>스탯별 투자</h4>
          {Object.entries(growthStats.statInvestments as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([stat, count]) => (
              <StatRow key={stat} label={stat} value={`${count}회`} />
            ))}
        </>
      )}

      {growthStats.statWinCorrelation && Object.keys(growthStats.statWinCorrelation).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>승률 기여도</h4>
          {Object.entries(growthStats.statWinCorrelation as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([stat, corr]) => (
              <StatRow
                key={stat}
                label={stat}
                value={`${corr > 0 ? '+' : ''}${(corr * 100).toFixed(1)}%`}
                valueColor={corr > 0 ? '#22c55e' : corr < 0 ? '#ef4444' : '#94a3b8'}
              />
            ))}
        </>
      )}

      {growthStats.finalStatDistribution && Object.keys(growthStats.finalStatDistribution).length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#94a3b8' }}>최종 스탯 분포</h4>
          {Object.entries(growthStats.finalStatDistribution as Record<string, { avg: number; max: number }>)
            .map(([stat, data]) => (
              <StatRow key={stat} label={stat} value={`평균 ${data.avg.toFixed(1)} / 최대 ${data.max}`} />
            ))}
        </>
      )}
    </>
  );
}

function AdvancedTab({ detailed }: { detailed: ReturnType<typeof getDetailedStats> }) {
  const [subTab, setSubTab] = useState<'synergy' | 'contribution' | 'analysis' | 'insights'>('synergy');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analysis = useMemo(() => analyzeStats(detailed as any), [detailed]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insightReport = useMemo(() => new BalanceInsightAnalyzer(detailed as any).generateReport(), [detailed]);

  const subTabStyle = (active: boolean): CSSProperties => ({
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    background: active ? '#3b82f6' : '#334155',
    color: active ? '#fff' : '#94a3b8',
  });

  return (
    <>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button onClick={() => setSubTab('synergy')} style={subTabStyle(subTab === 'synergy')}>시너지</button>
        <button onClick={() => setSubTab('contribution')} style={subTabStyle(subTab === 'contribution')}>기여도</button>
        <button onClick={() => setSubTab('analysis')} style={subTabStyle(subTab === 'analysis')}>AI분석</button>
        <button onClick={() => setSubTab('insights')} style={subTabStyle(subTab === 'insights')}>인사이트</button>
      </div>

      {/* 카드 시너지 */}
      {subTab === 'synergy' && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f59e0b' }}>🔗 카드 시너지</h3>
          {detailed.cardSynergyStats?.topSynergies && detailed.cardSynergyStats.topSynergies.length > 0 ? (
            detailed.cardSynergyStats.topSynergies.slice(0, 10).map((synergy: { pair: string; frequency: number; winRate: number }, i: number) => {
              const [card1, card2] = synergy.pair.split('+');
              return (
                <div key={i} style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fbbf24', fontSize: '12px' }}>{card1} + {card2}</span>
                    <span style={{ color: synergy.winRate > 0.5 ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>
                      {(synergy.winRate * 100).toFixed(1)}% 승률
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {synergy.frequency}회 등장
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: '#94a3b8' }}>시너지 데이터가 없습니다.</p>
          )}
        </>
      )}

      {/* 카드 기여도 */}
      {subTab === 'contribution' && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#8b5cf6' }}>📈 카드 기여도</h3>
          {detailed.cardContributionStats?.contribution && Object.keys(detailed.cardContributionStats.contribution).length > 0 ? (
            Object.entries(detailed.cardContributionStats.contribution)
              .filter(([cardId]) => (detailed.cardContributionStats?.runsWithCard?.[cardId] || 0) >= 2)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 10)
              .map(([cardId, contrib]) => {
                const contribution = contrib as number;
                const winRateWith = detailed.cardContributionStats?.winRateWithCard?.[cardId] || 0;
                return (
                  <StatRow
                    key={cardId}
                    label={cardId}
                    value={`${contribution > 0 ? '+' : ''}${(contribution * 100).toFixed(1)}% (보유시 ${(winRateWith * 100).toFixed(1)}%)`}
                    valueColor={contribution > 0 ? '#22c55e' : contribution < 0 ? '#ef4444' : '#94a3b8'}
                  />
                );
              })
          ) : (
            <p style={{ color: '#94a3b8' }}>기여도 데이터가 없습니다.</p>
          )}
        </>
      )}

      {/* AI 분석 */}
      {subTab === 'analysis' && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#f97316' }}>🔍 AI 분석</h3>
          <div style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', color: '#e2e8f0', margin: 0 }}>{analysis.summary}</p>
          </div>

          {analysis.problems.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#ef4444' }}>⚠️ 문제점</h4>
              {analysis.problems.slice(0, 5).map((problem: { description: string; category: string; severity: number }, i: number) => (
                <div key={i} style={{ padding: '6px', background: '#1e293b', borderRadius: '4px', marginBottom: '4px', borderLeft: `3px solid ${problem.severity >= 4 ? '#ef4444' : '#f59e0b'}` }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>[{problem.category}]</span>
                  <p style={{ fontSize: '12px', color: '#e2e8f0', margin: '4px 0 0' }}>{problem.description}</p>
                </div>
              ))}
            </>
          )}

          {analysis.recommendations.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#22c55e' }}>💡 개선 권장</h4>
              {analysis.recommendations.slice(0, 5).map((rec: { target: string; suggestion: string }, i: number) => (
                <div key={i} style={{ padding: '6px', background: '#1e293b', borderRadius: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#fbbf24' }}>{rec.target}</span>
                  <p style={{ fontSize: '12px', color: '#e2e8f0', margin: '4px 0 0' }}>{rec.suggestion}</p>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* 밸런스 인사이트 */}
      {subTab === 'insights' && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#10b981' }}>⚖️ 밸런스 인사이트</h3>

          {/* 요약 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>건강도</div>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: insightReport.summary.healthScore >= 70 ? '#22c55e' : insightReport.summary.healthScore >= 40 ? '#f59e0b' : '#ef4444'
              }}>
                {insightReport.summary.healthScore}/100
              </div>
            </div>
            <div style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>이슈</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>
                {insightReport.summary.criticalIssues + insightReport.summary.warningIssues}개
              </div>
            </div>
          </div>

          {/* 최우선 과제 */}
          {insightReport.summary.topPriorities.length > 0 && (
            <>
              <h4 style={{ margin: '8px 0 4px', fontSize: '12px', color: '#fbbf24' }}>🎯 우선 과제</h4>
              {insightReport.summary.topPriorities.slice(0, 3).map((p: string, i: number) => (
                <p key={i} style={{ fontSize: '11px', color: '#e2e8f0', margin: '4px 0', paddingLeft: '8px' }}>
                  {i + 1}. {p}
                </p>
              ))}
            </>
          )}

          {/* 필수픽 경고 */}
          {insightReport.mustPicks.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 4px', fontSize: '12px', color: '#ec4899' }}>⚠️ 필수픽</h4>
              {insightReport.mustPicks.slice(0, 3).map((mp: { targetName: string; explanation: string }, i: number) => (
                <div key={i} style={{ padding: '4px 6px', background: '#1e293b', borderRadius: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#f472b6', fontWeight: 'bold' }}>{mp.targetName}</span>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{mp.explanation}</p>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

// ==================== 헬퍼 컴포넌트/함수 ====================

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div style={STAT_ROW_STYLE}>
      <span style={STAT_LABEL_STYLE}>{label}</span>
      <span style={{ ...STAT_VALUE_STYLE, color: valueColor || '#fbbf24' }}>{value}</span>
    </div>
  );
}

function translateDeathCause(cause: string): string {
  const translations: Record<string, string> = {
    burst: '순간 피해',
    attrition: '지속 피해',
    bad_hand: '패 운영 실패',
    resource_exhaustion: '자원 고갈',
  };
  return translations[cause] || cause;
}

// ==================== 복사 함수 ====================

function formatAllStatsForCopy(
  stats: ReturnType<typeof getCurrentStats>,
  detailed: ReturnType<typeof getDetailedStats>
): string {
  const lines: string[] = [];

  // 전투 통계
  lines.push('# 게임 통계');
  lines.push('');
  lines.push('## 전투 통계');
  lines.push(`- 총 전투: ${stats.battles}회`);
  lines.push(`- 승리: ${stats.wins}회`);
  lines.push(`- 패배: ${stats.losses}회`);
  lines.push(`- 승률: ${stats.battles > 0 ? ((stats.wins / stats.battles) * 100).toFixed(1) : '0'}%`);
  lines.push(`- 평균 턴: ${stats.avgTurns.toFixed(1)}`);
  lines.push(`- 평균 가한 피해: ${stats.avgDamageDealt.toFixed(1)}`);
  lines.push(`- 평균 받은 피해: ${stats.avgDamageTaken.toFixed(1)}`);
  lines.push(`- 총 가한 피해: ${stats.totalDamageDealt.toLocaleString()}`);

  // 승리 방식
  if (stats.wins > 0) {
    lines.push('');
    lines.push('## 승리 방식');
    const soulRate = ((stats.soulDestructions / stats.wins) * 100).toFixed(1);
    const physRate = ((stats.physicalDestructions / stats.wins) * 100).toFixed(1);
    lines.push(`- 영혼파괴: ${stats.soulDestructions}회 (${soulRate}%)`);
    lines.push(`- 육체파괴: ${stats.physicalDestructions}회 (${physRate}%)`);
  }

  // 런 통계
  lines.push('');
  lines.push('## 런 통계');
  lines.push(`- 총 런: ${stats.totalRuns}회`);
  lines.push(`- 클리어: ${stats.successfulRuns}회`);
  if (stats.totalRuns > 0) {
    lines.push(`- 클리어율: ${((stats.successfulRuns / stats.totalRuns) * 100).toFixed(1)}%`);
  }
  if (detailed.runStats) {
    lines.push(`- 평균 도달 층: ${(detailed.runStats.avgLayerReached || 0).toFixed(1)}`);
    lines.push(`- 평균 전투 승리: ${(detailed.runStats.avgBattlesWon || 0).toFixed(1)}`);
    lines.push(`- 평균 골드 획득: ${(detailed.runStats.avgGoldEarned || 0).toFixed(0)}G`);
    lines.push(`- 평균 덱 크기: ${(detailed.runStats.avgFinalDeckSize || 0).toFixed(1)}장`);
    lines.push(`- 평균 상징 수: ${(detailed.runStats.avgFinalRelicCount || 0).toFixed(1)}개`);

    // 사망 원인
    if (detailed.runStats.deathCauses && Object.keys(detailed.runStats.deathCauses).length > 0) {
      lines.push('- 사망 원인:');
      for (const [cause, count] of Object.entries(detailed.runStats.deathCauses as Record<string, number>).sort((a, b) => b[1] - a[1])) {
        const rate = stats.totalRuns > 0 ? ((count / stats.totalRuns) * 100).toFixed(1) : '0';
        lines.push(`  - ${cause}: ${count}회 (${rate}%)`);
      }
    }
  }

  // 몬스터별 통계
  if (detailed.monsterStats && detailed.monsterStats.size > 0) {
    lines.push('');
    lines.push('## 몬스터별 통계');
    const sortedMonsters = Array.from(detailed.monsterStats.entries())
      .sort((a, b) => (b[1].battles || 0) - (a[1].battles || 0));

    for (const [id, data] of sortedMonsters) {
      const battleCount = data.battles || 0;
      const winRate = battleCount > 0 ? ((data.wins / battleCount) * 100).toFixed(1) : '0';
      const displayName = data.monsterName || id;
      lines.push(`- ${displayName}: ${battleCount}전 ${data.wins}승 (${winRate}%) | 평균 ${(data.avgTurns || 0).toFixed(1)}턴`);
    }
  }

  // 카드 사용 통계
  if (detailed.cardDeepStats && detailed.cardDeepStats.size > 0) {
    lines.push('');
    lines.push('## 카드 사용 통계 (상위 15)');
    const cards = Array.from(detailed.cardDeepStats.entries())
      .filter(([, data]) => (data.timesPlayed || 0) > 0)
      .sort((a, b) => (b[1].timesPlayed || 0) - (a[1].timesPlayed || 0))
      .slice(0, 15);

    for (const [id, data] of cards) {
      const winRate = data.winRateWith !== undefined ? (data.winRateWith * 100).toFixed(1) : '-';
      lines.push(`- ${data.cardName || id}: ${data.timesPlayed}회 사용 | 승률 ${winRate}%`);
    }
  }

  // 상징 통계
  if (detailed.relicStats && detailed.relicStats.size > 0) {
    lines.push('');
    lines.push('## 상징 통계');
    const relics = Array.from(detailed.relicStats.entries())
      .sort((a, b) => (b[1].timesAcquired || 0) - (a[1].timesAcquired || 0));

    for (const [id, data] of relics) {
      const contribution = (data.contribution || 0) * 100;
      lines.push(`- ${data.relicName || id}: ${data.timesAcquired}회 획득 | 승률 기여 ${contribution >= 0 ? '+' : ''}${contribution.toFixed(1)}%p`);
    }
  }

  // 콤보 통계
  const comboDetails = detailed.pokerComboStats?.comboDetails;
  if (comboDetails && Object.keys(comboDetails).length > 0) {
    lines.push('');
    lines.push('## 포커 콤보 통계');
    const sortedCombos = Object.entries(comboDetails)
      .sort((a, b) => (b[1].totalOccurrences || 0) - (a[1].totalOccurrences || 0));

    for (const [comboName, data] of sortedCombos) {
      const winRate = data.totalOccurrences > 0
        ? ((data.inWins / data.totalOccurrences) * 100).toFixed(1)
        : '0';
      lines.push(`- ${comboName}: ${data.totalOccurrences}회 발동 | 승률 ${winRate}% | 평균 에테르 ${(data.avgEtherGained || 0).toFixed(1)}`);
    }
  }

  // 상점 통계
  if (detailed.shopStats && detailed.shopStats.totalVisits > 0) {
    lines.push('');
    lines.push('## 상점 통계');
    lines.push(`- 총 방문: ${detailed.shopStats.totalVisits}회`);
    lines.push(`- 총 지출: ${detailed.shopStats.totalSpent?.toLocaleString() ?? 0}G`);
    lines.push(`- 평균 지출: ${(detailed.shopStats.avgSpentPerVisit || 0).toFixed(0)}G/회`);
    lines.push(`- 카드 제거: ${detailed.shopStats.cardsRemoved ?? 0}회`);

    if (detailed.shopStats.relicsPurchased && Object.keys(detailed.shopStats.relicsPurchased).length > 0) {
      lines.push('- 구매한 상징:');
      for (const [id, count] of Object.entries(detailed.shopStats.relicsPurchased as Record<string, number>)) {
        lines.push(`  - ${id}: ${count}회`);
      }
    }
  }

  // 이벤트 통계
  if (detailed.eventStats && detailed.eventStats.size > 0) {
    lines.push('');
    lines.push('## 이벤트 통계');
    const sortedEvents = Array.from(detailed.eventStats.entries())
      .sort((a, b) => (b[1].occurrences || 0) - (a[1].occurrences || 0));

    for (const [id, data] of sortedEvents) {
      const successRate = data.occurrences > 0
        ? ((data.successes / data.occurrences) * 100).toFixed(1)
        : '0';
      lines.push(`- ${data.eventName || id}: ${data.occurrences}회 발생 | 성공률 ${successRate}%`);
    }
  }

  // 기록 통계
  if (detailed.recordStats) {
    lines.push('');
    lines.push('## 최고 기록');
    lines.push(`- 최장 연승: ${detailed.recordStats.longestWinStreak || 0}연승`);
    lines.push(`- 최대 단일 턴 피해: ${(detailed.recordStats.maxSingleTurnDamage || 0).toLocaleString()}`);
    if (detailed.recordStats.fastestClear) {
      lines.push(`- 최빠른 클리어: ${detailed.recordStats.fastestClear}턴`);
    }
    if (detailed.recordStats.largestDeckClear) {
      lines.push(`- 최대 덱 크기 클리어: ${detailed.recordStats.largestDeckClear}장`);
    }
  }

  // 사망 분석
  if (detailed.deathStats && detailed.deathStats.totalDeaths > 0) {
    lines.push('');
    lines.push('## 사망 분석');
    lines.push(`- 총 사망: ${detailed.deathStats.totalDeaths}회`);
    lines.push(`- 평균 사망 층: ${(detailed.deathStats.avgDeathFloor || 0).toFixed(1)}`);

    if (detailed.deathStats.deadliestEnemies && detailed.deathStats.deadliestEnemies.length > 0) {
      lines.push('- 가장 위험한 적:');
      for (const enemy of detailed.deathStats.deadliestEnemies.slice(0, 5)) {
        lines.push(`  - ${enemy.enemyId}: ${enemy.deaths}회 사망`);
      }
    }
  }

  return lines.join('\n');
}

export default StatsWidget;
