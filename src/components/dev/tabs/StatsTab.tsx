/**
 * StatsTab.tsx
 * 게임 플레이 통계 뷰어 - StatsBridge에서 수집된 실제 게임 통계 표시
 */

import { useState, useCallback, memo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  getDetailedStats,
  getCurrentStats,
  resetStatsCollector,
  invalidateStatsCache,
} from '../../../simulator/bridge/stats-bridge';

// 스타일 상수
const STYLES = {
  sectionHeader: { marginTop: 0, color: '#22c55e', fontSize: '1.125rem' } as CSSProperties,
  sectionBox: {
    padding: '16px',
    background: '#0f172a',
    borderRadius: '8px',
    marginBottom: '16px',
  } as CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginTop: '12px',
  } as CSSProperties,
  statItem: {
    padding: '12px',
    background: '#1e293b',
    borderRadius: '6px',
    textAlign: 'center' as const,
  } as CSSProperties,
  statLabel: { color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' } as CSSProperties,
  statValue: { color: '#fbbf24', fontWeight: 'bold', fontSize: '1.25rem' } as CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8rem',
  } as CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '8px',
    background: '#1e293b',
    color: '#94a3b8',
    borderBottom: '1px solid #334155',
  } as CSSProperties,
  td: {
    padding: '8px',
    borderBottom: '1px solid #334155',
    color: '#e2e8f0',
  } as CSSProperties,
  scrollBox: { maxHeight: '250px', overflowY: 'auto' as const } as CSSProperties,
  button: {
    padding: '8px 16px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginRight: '8px',
  } as CSSProperties,
  dangerButton: {
    padding: '8px 16px',
    background: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  } as CSSProperties,
  subSection: {
    marginTop: '16px',
  } as CSSProperties,
  subHeader: {
    color: '#94a3b8',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as CSSProperties,
  badge: {
    padding: '2px 8px',
    background: '#334155',
    borderRadius: '4px',
    fontSize: '0.75rem',
    color: '#cbd5e1',
  } as CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#64748b',
  } as CSSProperties,
  tabNav: {
    display: 'flex',
    gap: '4px',
    marginBottom: '16px',
  } as CSSProperties,
} as const;

type SubTab = 'overview' | 'enemies' | 'cards' | 'synergy';

export const StatsTab = memo(function StatsTab() {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // 통계 데이터 가져오기
  const simpleStats = getCurrentStats();
  const detailedStats = getDetailedStats();

  // 자동 새로고침 (5초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      invalidateStatsCache();
      setRefreshKey(k => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    invalidateStatsCache();
    setRefreshKey(k => k + 1);
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('정말 모든 통계를 초기화하시겠습니까?')) {
      resetStatsCollector();
      invalidateStatsCache();
      setRefreshKey(k => k + 1);
    }
  }, []);

  const getWinRateColor = (rate: number): string => {
    if (rate >= 0.7) return '#22c55e';
    if (rate >= 0.5) return '#fbbf24';
    if (rate >= 0.3) return '#f97316';
    return '#ef4444';
  };

  const getSubTabStyle = (tab: SubTab): CSSProperties => ({
    padding: '6px 12px',
    background: subTab === tab ? '#3b82f6' : 'transparent',
    border: 'none',
    color: subTab === tab ? '#fff' : '#94a3b8',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  });

  // 적별 통계 변환
  const enemyStats = Array.from(detailedStats.monsterStats?.entries() || [])
    .map(([id, stats]) => ({
      id,
      ...stats,
      winRate: stats.encounters > 0 ? stats.wins / stats.encounters : 0,
    }))
    .sort((a, b) => b.encounters - a.encounters);

  // 카드별 통계 변환
  const cardStats = Array.from(detailedStats.cardDeepStats?.entries() || [])
    .map(([id, stats]) => ({
      id,
      timesUsed: stats.timesUsed || 0,
      damageDealt: stats.damageDealt || 0,
      avgDamagePerUse: stats.timesUsed > 0 ? (stats.damageDealt || 0) / stats.timesUsed : 0,
    }))
    .filter(s => s.timesUsed > 0)
    .sort((a, b) => b.timesUsed - a.timesUsed);

  // 시너지 통계
  const synergyStats = detailedStats.cardSynergyStats || {
    topSynergies: [],
    topTripleSynergies: [],
  };

  const hasBattleData = simpleStats.battles > 0;

  return (
    <div key={refreshKey}>
      <h3 style={STYLES.sectionHeader}>📊 게임 통계 (실시간)</h3>

      {/* 버튼 영역 */}
      <div style={{ marginBottom: '16px' }}>
        <button onClick={handleRefresh} style={STYLES.button}>
          🔄 새로고침
        </button>
        <button onClick={handleReset} style={STYLES.dangerButton}>
          🗑️ 초기화
        </button>
        <span style={{ marginLeft: '12px', color: '#64748b', fontSize: '0.75rem' }}>
          5초마다 자동 새로고침
        </span>
      </div>

      {/* 서브탭 네비게이션 */}
      <div style={STYLES.tabNav}>
        <button onClick={() => setSubTab('overview')} style={getSubTabStyle('overview')}>
          📈 개요
        </button>
        <button onClick={() => setSubTab('enemies')} style={getSubTabStyle('enemies')}>
          👹 적별 통계
        </button>
        <button onClick={() => setSubTab('cards')} style={getSubTabStyle('cards')}>
          🃏 카드 통계
        </button>
        <button onClick={() => setSubTab('synergy')} style={getSubTabStyle('synergy')}>
          ⚡ 시너지
        </button>
      </div>

      {!hasBattleData ? (
        <div style={STYLES.emptyState}>
          <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📭</p>
          <p>아직 전투 데이터가 없습니다.</p>
          <p style={{ fontSize: '0.8rem' }}>게임을 플레이하면 통계가 여기에 표시됩니다.</p>
        </div>
      ) : (
        <>
          {/* 개요 탭 */}
          {subTab === 'overview' && (
            <>
              {/* 요약 통계 */}
              <div style={STYLES.sectionBox}>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>총 전투</div>
                    <div style={STYLES.statValue}>{simpleStats.battles}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>승리</div>
                    <div style={{ ...STYLES.statValue, color: '#22c55e' }}>{simpleStats.wins}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>패배</div>
                    <div style={{ ...STYLES.statValue, color: '#ef4444' }}>{simpleStats.losses}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>승률</div>
                    <div style={{ ...STYLES.statValue, color: getWinRateColor(simpleStats.winRate) }}>
                      {(simpleStats.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div style={{ ...STYLES.statsGrid, marginTop: '8px' }}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>평균 턴</div>
                    <div style={STYLES.statValue}>{simpleStats.avgTurns.toFixed(1)}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>총 피해량</div>
                    <div style={STYLES.statValue}>{simpleStats.totalDamageDealt}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>평균 가한 피해</div>
                    <div style={STYLES.statValue}>{simpleStats.avgDamageDealt.toFixed(1)}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>평균 받은 피해</div>
                    <div style={STYLES.statValue}>{simpleStats.avgDamageTaken.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* 런 통계 */}
              <div style={STYLES.sectionBox}>
                <div style={STYLES.subHeader}>
                  🏃 런 통계
                </div>
                <div style={{ ...STYLES.statsGrid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>총 런</div>
                    <div style={STYLES.statValue}>{simpleStats.totalRuns}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>클리어</div>
                    <div style={{ ...STYLES.statValue, color: '#22c55e' }}>{simpleStats.successfulRuns}</div>
                  </div>
                  <div style={STYLES.statItem}>
                    <div style={STYLES.statLabel}>클리어율</div>
                    <div style={{ ...STYLES.statValue, color: getWinRateColor(simpleStats.totalRuns > 0 ? simpleStats.successfulRuns / simpleStats.totalRuns : 0) }}>
                      {simpleStats.totalRuns > 0
                        ? ((simpleStats.successfulRuns / simpleStats.totalRuns) * 100).toFixed(1)
                        : '0'}%
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 적별 통계 탭 */}
          {subTab === 'enemies' && (
            <div style={STYLES.sectionBox}>
              <div style={STYLES.subHeader}>
                👹 적별 승률
                <span style={STYLES.badge}>{enemyStats.length}종</span>
              </div>
              {enemyStats.length > 0 ? (
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead>
                      <tr>
                        <th style={STYLES.th}>적</th>
                        <th style={STYLES.th}>전투</th>
                        <th style={STYLES.th}>승리</th>
                        <th style={STYLES.th}>패배</th>
                        <th style={STYLES.th}>승률</th>
                        <th style={STYLES.th}>평균 턴</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enemyStats.map((e) => (
                        <tr key={e.id}>
                          <td style={STYLES.td}>{e.id}</td>
                          <td style={STYLES.td}>{e.encounters}</td>
                          <td style={{ ...STYLES.td, color: '#22c55e' }}>{e.wins}</td>
                          <td style={{ ...STYLES.td, color: '#ef4444' }}>{e.losses}</td>
                          <td style={{ ...STYLES.td, color: getWinRateColor(e.winRate), fontWeight: 'bold' }}>
                            {(e.winRate * 100).toFixed(1)}%
                          </td>
                          <td style={STYLES.td}>{e.avgTurns?.toFixed(1) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center' }}>데이터 없음</p>
              )}
            </div>
          )}

          {/* 카드 통계 탭 */}
          {subTab === 'cards' && (
            <div style={STYLES.sectionBox}>
              <div style={STYLES.subHeader}>
                🃏 카드 사용 통계
                <span style={STYLES.badge}>{cardStats.length}종</span>
              </div>
              {cardStats.length > 0 ? (
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead>
                      <tr>
                        <th style={STYLES.th}>카드</th>
                        <th style={STYLES.th}>사용 횟수</th>
                        <th style={STYLES.th}>총 피해</th>
                        <th style={STYLES.th}>평균 피해</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardStats.slice(0, 20).map((c) => (
                        <tr key={c.id}>
                          <td style={STYLES.td}>{c.id}</td>
                          <td style={STYLES.td}>{c.timesUsed}회</td>
                          <td style={STYLES.td}>{c.damageDealt}</td>
                          <td style={STYLES.td}>{c.avgDamagePerUse.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center' }}>데이터 없음</p>
              )}
            </div>
          )}

          {/* 시너지 탭 */}
          {subTab === 'synergy' && (
            <>
              {/* 2-카드 시너지 */}
              <div style={STYLES.sectionBox}>
                <div style={STYLES.subHeader}>
                  ⚡ TOP 2-카드 시너지
                  <span style={STYLES.badge}>{synergyStats.topSynergies?.length || 0}개</span>
                </div>
                {synergyStats.topSynergies && synergyStats.topSynergies.length > 0 ? (
                  <div style={STYLES.scrollBox}>
                    <table style={STYLES.table}>
                      <thead>
                        <tr>
                          <th style={STYLES.th}>조합</th>
                          <th style={STYLES.th}>등장</th>
                          <th style={STYLES.th}>승률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {synergyStats.topSynergies.slice(0, 10).map((s, i) => (
                          <tr key={i}>
                            <td style={STYLES.td}>{s.pair}</td>
                            <td style={STYLES.td}>{s.frequency}회</td>
                            <td style={{ ...STYLES.td, color: getWinRateColor(s.winRate), fontWeight: 'bold' }}>
                              {(s.winRate * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#64748b', textAlign: 'center' }}>데이터 없음</p>
                )}
              </div>

              {/* 3-카드 시너지 */}
              <div style={STYLES.sectionBox}>
                <div style={STYLES.subHeader}>
                  🔥 TOP 3-카드 시너지
                  <span style={STYLES.badge}>{synergyStats.topTripleSynergies?.length || 0}개</span>
                </div>
                {synergyStats.topTripleSynergies && synergyStats.topTripleSynergies.length > 0 ? (
                  <div style={STYLES.scrollBox}>
                    <table style={STYLES.table}>
                      <thead>
                        <tr>
                          <th style={STYLES.th}>조합</th>
                          <th style={STYLES.th}>등장</th>
                          <th style={STYLES.th}>승률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {synergyStats.topTripleSynergies.slice(0, 10).map((s, i) => (
                          <tr key={i}>
                            <td style={STYLES.td}>{s.triple}</td>
                            <td style={STYLES.td}>{s.frequency}회</td>
                            <td style={{ ...STYLES.td, color: getWinRateColor(s.winRate), fontWeight: 'bold' }}>
                              {(s.winRate * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#64748b', textAlign: 'center' }}>데이터 없음 (최소 2회 등장 필요)</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
});
