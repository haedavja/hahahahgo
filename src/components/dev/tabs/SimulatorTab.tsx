/**
 * SimulatorTab.tsx
 * 시뮬레이터 탭 - 게임 내에서 런 시뮬레이션 실행 및 상세 통계 확인
 */

import { useState, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';

// 스타일 상수
const STYLES = {
  sectionHeader: { marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' } as CSSProperties,
  sectionBox: { padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '16px' } as CSSProperties,
  label: { display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' } as CSSProperties,
  input: { width: '80px', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  select: { flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  button: { padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer' } as CSSProperties,
  buttonRunning: { padding: '8px 16px', background: '#64748b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'not-allowed' } as CSSProperties,
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' } as CSSProperties,
  statItem: { padding: '8px', background: '#1e293b', borderRadius: '6px', fontSize: '0.875rem' } as CSSProperties,
  statLabel: { color: '#94a3b8', fontSize: '0.75rem' } as CSSProperties,
  statValue: { color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' } as CSSProperties,
  progressBar: { height: '4px', background: '#334155', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' } as CSSProperties,
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.2s' } as CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' } as CSSProperties,
  th: { textAlign: 'left', padding: '6px 8px', background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' } as CSSProperties,
  td: { padding: '6px 8px', borderBottom: '1px solid #334155', color: '#e2e8f0' } as CSSProperties,
  tabButton: { padding: '6px 12px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '2px solid transparent' } as CSSProperties,
  tabButtonActive: { padding: '6px 12px', background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '2px solid #3b82f6', fontWeight: 'bold' } as CSSProperties,
  scrollBox: { maxHeight: '300px', overflowY: 'auto' } as CSSProperties,
} as const;

type StatTab = 'run' | 'shop' | 'dungeon' | 'event' | 'item' | 'monster' | 'card';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DetailedStats = any; // finalize()의 반환 타입

export const SimulatorTab = memo(function SimulatorTab() {
  const [runCount, setRunCount] = useState(10);
  const [difficulty, setDifficulty] = useState(1);
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive' | 'defensive'>('balanced');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [activeStatTab, setActiveStatTab] = useState<StatTab>('run');

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setStats(null);

    try {
      const { RunSimulator } = await import('../../../simulator/game/run-simulator');
      const { StatsCollector } = await import('../../../simulator/analysis/detailed-stats');
      const { setLogLevel, LogLevel } = await import('../../../simulator/core/logger');

      setLogLevel(LogLevel.SILENT);

      const collector = new StatsCollector();
      const simulator = new RunSimulator();
      simulator.setStatsCollector(collector);

      await simulator.loadGameData();

      for (let i = 0; i < runCount; i++) {
        simulator.simulateRun({
          initialPlayer: {
            hp: 80, maxHp: 80, gold: 150, intel: 0, material: 0, loot: 0, grace: 0,
            strength: 0, agility: 0, insight: 0,
            deck: ['shoot', 'shoot', 'strike', 'strike', 'strike', 'reload', 'quarte', 'octave', 'breach', 'deflect'],
            relics: [], items: [], upgradedCards: []
          },
          difficulty,
          strategy
        });

        setProgress(Math.round(((i + 1) / runCount) * 100));
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      setStats(collector.finalize());
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [runCount, difficulty, strategy]);

  const statTabs: { id: StatTab; label: string }[] = [
    { id: 'run', label: '런' },
    { id: 'shop', label: '상점' },
    { id: 'dungeon', label: '던전' },
    { id: 'event', label: '이벤트' },
    { id: 'item', label: '아이템' },
    { id: 'monster', label: '몬스터' },
    { id: 'card', label: '카드' },
  ];

  return (
    <div>
      <h3 style={STYLES.sectionHeader}>🎮 런 시뮬레이터</h3>

      {/* 설정 섹션 */}
      <div style={STYLES.sectionBox}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <label style={STYLES.label}>런 횟수</label>
            <input type="number" min={1} max={100} value={runCount}
              onChange={e => setRunCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>난이도</label>
            <input type="number" min={1} max={5} value={difficulty}
              onChange={e => setDifficulty(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input} disabled={isRunning} />
          </div>
          <div>
            <label style={STYLES.label}>전략</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value as typeof strategy)}
              style={STYLES.select} disabled={isRunning}>
              <option value="balanced">균형</option>
              <option value="aggressive">공격적</option>
              <option value="defensive">방어적</option>
            </select>
          </div>
        </div>
        <button onClick={runSimulation} style={isRunning ? STYLES.buttonRunning : STYLES.button} disabled={isRunning}>
          {isRunning ? `시뮬레이션 중... ${progress}%` : '시뮬레이션 실행'}
        </button>
        {isRunning && <div style={STYLES.progressBar}><div style={{ ...STYLES.progressFill, width: `${progress}%` }} /></div>}
      </div>

      {/* 결과 통계 */}
      {stats && (
        <>
          {/* 탭 네비게이션 */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
            {statTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveStatTab(tab.id)}
                style={activeStatTab === tab.id ? STYLES.tabButtonActive : STYLES.tabButton}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={STYLES.sectionBox}>
            {/* 런 통계 */}
            {activeStatTab === 'run' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>📊 런 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 런</div><div style={STYLES.statValue}>{stats.runStats.totalRuns ?? 0}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>성공률</div><div style={STYLES.statValue}>{((stats.runStats.successRate ?? 0) * 100).toFixed(1)}%</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 도달 층</div><div style={STYLES.statValue}>{(stats.runStats.avgLayerReached ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 전투 승리</div><div style={STYLES.statValue}>{(stats.runStats.avgBattlesWon ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 골드 획득</div><div style={STYLES.statValue}>{(stats.runStats.avgGoldEarned ?? 0).toFixed(0)}G</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 덱 크기</div><div style={STYLES.statValue}>{(stats.runStats.avgFinalDeckSize ?? 0).toFixed(1)}장</div></div>
                </div>
              </>
            )}

            {/* 상점 통계 */}
            {activeStatTab === 'shop' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#a855f7' }}>🛒 상점 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>방문</div><div style={STYLES.statValue}>{stats.shopStats.totalVisits}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 지출</div><div style={STYLES.statValue}>{stats.shopStats.totalSpent}G</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 지출</div><div style={STYLES.statValue}>{(stats.shopStats.avgSpentPerVisit ?? 0).toFixed(0)}G/회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>카드 제거</div><div style={STYLES.statValue}>{stats.shopStats.cardsRemoved}회</div></div>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매한 상징</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>상징</th><th style={STYLES.th}>횟수</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.shopStats.relicsPurchased || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{count as number}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매한 아이템</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>횟수</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.shopStats.itemsPurchased || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{count as number}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>구매 기록 (이유별)</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>타입</th><th style={STYLES.th}>가격</th><th style={STYLES.th}>이유</th></tr></thead>
                    <tbody>
                      {(stats.shopStats.purchaseRecords || []).map((rec: { itemName: string; type: string; price: number; reason: string }, i: number) => (
                        <tr key={i}><td style={STYLES.td}>{rec.itemName}</td><td style={STYLES.td}>{rec.type}</td><td style={STYLES.td}>{rec.price}G</td><td style={STYLES.td}>{rec.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 던전 통계 */}
            {activeStatTab === 'dungeon' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#f97316' }}>🏰 던전 통계</h4>
                <div style={STYLES.statsGrid}>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>총 진입</div><div style={STYLES.statValue}>{stats.dungeonStats.totalAttempts ?? 0}회</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>클리어율</div><div style={STYLES.statValue}>{((stats.dungeonStats.clearRate ?? 0) * 100).toFixed(1)}%</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 소요 턴</div><div style={STYLES.statValue}>{(stats.dungeonStats.avgTurns ?? 0).toFixed(1)}</div></div>
                  <div style={STYLES.statItem}><div style={STYLES.statLabel}>평균 받은 피해</div><div style={STYLES.statValue}>{(stats.dungeonStats.avgDamageTaken ?? 0).toFixed(1)}</div></div>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
                  <div>획득 카드: {stats.dungeonStats.rewards?.cards?.length ?? 0}장 - [{(stats.dungeonStats.rewards?.cards ?? []).join(', ')}]</div>
                  <div>획득 상징: {stats.dungeonStats.rewards?.relics?.length ?? 0}개 - [{(stats.dungeonStats.rewards?.relics ?? []).join(', ')}]</div>
                </div>
              </>
            )}

            {/* 이벤트 통계 */}
            {activeStatTab === 'event' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#06b6d4' }}>🎲 이벤트 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>이벤트</th><th style={STYLES.th}>발생</th><th style={STYLES.th}>성공</th><th style={STYLES.th}>골드</th><th style={STYLES.th}>재료</th></tr></thead>
                    <tbody>
                      {Array.from(stats.eventStats.entries()).sort((a: [string, { occurrences: number }], b: [string, { occurrences: number }]) => b[1].occurrences - a[1].occurrences).map(([id, e]: [string, { occurrences: number; successes: number; totalGoldChange?: number; totalMaterialChange?: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{e.occurrences}회</td><td style={STYLES.td}>{e.successes}회</td><td style={STYLES.td}>{e.totalGoldChange ?? 0}</td><td style={STYLES.td}>{e.totalMaterialChange ?? 0}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>이벤트 선택 상세</h5>
                <div style={STYLES.scrollBox}>
                  {Array.from(stats.eventChoiceStats.entries()).map(([eventId, choiceStats]: [string, { occurrences?: number; timesSkipped?: number; choiceOutcomes?: Record<string, { timesChosen?: number; avgHpChange?: number; avgGoldChange?: number; successRate?: number }> }]) => (
                    <div key={eventId} style={{ marginBottom: '12px', padding: '8px', background: '#1e293b', borderRadius: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{eventId}: 발생 {choiceStats.occurrences ?? 0}회, 스킵 {choiceStats.timesSkipped ?? 0}회</div>
                      {choiceStats.choiceOutcomes && Object.entries(choiceStats.choiceOutcomes).map(([choiceId, outcome]) => (
                        <div key={choiceId} style={{ marginLeft: '12px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          선택 "{choiceId}": {outcome.timesChosen ?? 0}회, HP {(outcome.avgHpChange ?? 0).toFixed(1)}, 골드 {(outcome.avgGoldChange ?? 0).toFixed(0)}, 성공률 {((outcome.successRate ?? 0) * 100).toFixed(0)}%
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 아이템 통계 */}
            {activeStatTab === 'item' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#84cc16' }}>🎒 아이템 통계</h4>
                <h5 style={{ margin: '0 0 8px 0', color: '#cbd5e1' }}>획득한 아이템</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>획득</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.itemUsageStats.itemsAcquired || {}).map(([id, count]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{count as number}개</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: '#cbd5e1' }}>아이템 사용 효과</h5>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>아이템</th><th style={STYLES.th}>사용</th><th style={STYLES.th}>HP회복</th><th style={STYLES.th}>피해</th><th style={STYLES.th}>특수효과</th></tr></thead>
                    <tbody>
                      {Object.entries(stats.itemUsageStats.itemEffects || {}).map(([id, eff]: [string, { timesUsed: number; totalHpHealed: number; totalDamage: number; specialEffects: Record<string, number> }]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{eff.timesUsed}회</td><td style={STYLES.td}>{eff.totalHpHealed}</td><td style={STYLES.td}>{eff.totalDamage}</td><td style={STYLES.td}>{JSON.stringify(eff.specialEffects)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 몬스터 통계 */}
            {activeStatTab === 'monster' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#ef4444' }}>👹 몬스터 전투 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>몬스터</th><th style={STYLES.th}>조우</th><th style={STYLES.th}>승리</th><th style={STYLES.th}>패배</th><th style={STYLES.th}>승률</th><th style={STYLES.th}>평균턴</th></tr></thead>
                    <tbody>
                      {Array.from(stats.monsterStats.entries()).sort((a: [string, { battles: number }], b: [string, { battles: number }]) => b[1].battles - a[1].battles).map(([id, m]: [string, { battles: number; wins: number; losses: number; avgTurns?: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{m.battles}회</td><td style={STYLES.td}>{m.wins}회</td><td style={STYLES.td}>{m.losses}회</td><td style={STYLES.td}>{m.battles > 0 ? ((m.wins / m.battles) * 100).toFixed(0) : 0}%</td><td style={STYLES.td}>{(m.avgTurns ?? 0).toFixed(1)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 카드 통계 */}
            {activeStatTab === 'card' && (
              <>
                <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6' }}>🃏 카드 사용 통계</h4>
                <div style={STYLES.scrollBox}>
                  <table style={STYLES.table}>
                    <thead><tr><th style={STYLES.th}>카드</th><th style={STYLES.th}>사용</th><th style={STYLES.th}>승리시</th><th style={STYLES.th}>패배시</th><th style={STYLES.th}>피해</th><th style={STYLES.th}>방어</th><th style={STYLES.th}>교차</th></tr></thead>
                    <tbody>
                      {Array.from(stats.cardStats.entries()).sort((a: [string, { totalUses: number }], b: [string, { totalUses: number }]) => b[1].totalUses - a[1].totalUses).map(([id, c]: [string, { totalUses: number; usesInWins: number; usesInLosses: number; totalDamage: number; totalBlock: number; crossTriggers: number }]) => (
                        <tr key={id}><td style={STYLES.td}>{id}</td><td style={STYLES.td}>{c.totalUses}회</td><td style={STYLES.td}>{c.usesInWins}회</td><td style={STYLES.td}>{c.usesInLosses}회</td><td style={STYLES.td}>{c.totalDamage}</td><td style={STYLES.td}>{c.totalBlock}</td><td style={STYLES.td}>{c.crossTriggers}회</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
});
