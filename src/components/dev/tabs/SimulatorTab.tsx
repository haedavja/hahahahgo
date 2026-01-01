/**
 * SimulatorTab.tsx
 * 시뮬레이터 탭 - 게임 내에서 런 시뮬레이션 실행 및 통계 확인
 */

import { useState, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';

// 스타일 상수
const STYLES = {
  sectionHeader: { marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' } as CSSProperties,
  sectionBox: { padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '20px' } as CSSProperties,
  label: { display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' } as CSSProperties,
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center' } as CSSProperties,
  input: { width: '80px', padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  select: { flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem' } as CSSProperties,
  button: { padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer' } as CSSProperties,
  buttonRunning: { padding: '8px 16px', background: '#64748b', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'not-allowed' } as CSSProperties,
  hint: { fontSize: '0.75rem', color: '#64748b', marginTop: '4px' } as CSSProperties,
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' } as CSSProperties,
  statItem: { padding: '8px', background: '#1e293b', borderRadius: '6px', fontSize: '0.875rem' } as CSSProperties,
  statLabel: { color: '#94a3b8', fontSize: '0.75rem' } as CSSProperties,
  statValue: { color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' } as CSSProperties,
  logBox: { maxHeight: '200px', overflowY: 'auto', background: '#0f172a', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' } as CSSProperties,
  progressBar: { height: '4px', background: '#334155', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' } as CSSProperties,
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.2s' } as CSSProperties,
} as const;

interface SimulatorStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  avgLayerReached: number;
  avgBattlesWon: number;
  avgGoldEarned: number;
  avgFinalDeckSize: number;
}

interface MonsterStat {
  battles: number;
  wins: number;
  losses: number;
  avgTurns: number;
}

interface SimulatorResult {
  runStats: SimulatorStats;
  monsterStats: Map<string, MonsterStat>;
  topCards: Array<{ id: string; uses: number }>;
}

export const SimulatorTab = memo(function SimulatorTab() {
  const [runCount, setRunCount] = useState(10);
  const [difficulty, setDifficulty] = useState(1);
  const [strategy, setStrategy] = useState<'balanced' | 'aggressive' | 'defensive'>('balanced');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);
    setLogs([]);
    addLog('시뮬레이터 초기화 중...');

    try {
      // 동적 임포트로 시뮬레이터 로드
      const { RunSimulator } = await import('../../../simulator/game/run-simulator');
      const { StatsCollector } = await import('../../../simulator/analysis/detailed-stats');
      const { setLogLevel, LogLevel } = await import('../../../simulator/core/logger');

      setLogLevel(LogLevel.SILENT);
      addLog('모듈 로드 완료');

      const stats = new StatsCollector();
      const simulator = new RunSimulator();
      simulator.setStatsCollector(stats);

      addLog('게임 데이터 로드 중...');
      await simulator.loadGameData();
      addLog('게임 데이터 로드 완료');

      addLog(`${runCount}회 시뮬레이션 시작 (난이도: ${difficulty}, 전략: ${strategy})`);

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

        // UI 업데이트를 위한 짧은 대기
        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      const s = stats.finalize();
      addLog('시뮬레이션 완료!');

      // 결과 변환
      const monsterStats = new Map<string, MonsterStat>();
      s.monsterStats.forEach((val, key) => {
        monsterStats.set(key, {
          battles: val.battles,
          wins: val.wins,
          losses: val.losses,
          avgTurns: val.avgTurns ?? 0,
        });
      });

      // 상위 카드 추출
      const topCards = Array.from(s.cardStats.entries())
        .sort((a, b) => b[1].totalUses - a[1].totalUses)
        .slice(0, 5)
        .map(([id, stat]) => ({ id, uses: stat.totalUses }));

      setResult({
        runStats: {
          totalRuns: s.runStats.totalRuns ?? 0,
          successfulRuns: s.runStats.successfulRuns ?? 0,
          failedRuns: s.runStats.failedRuns ?? 0,
          successRate: s.runStats.successRate ?? 0,
          avgLayerReached: s.runStats.avgLayerReached ?? 0,
          avgBattlesWon: s.runStats.avgBattlesWon ?? 0,
          avgGoldEarned: s.runStats.avgGoldEarned ?? 0,
          avgFinalDeckSize: s.runStats.avgFinalDeckSize ?? 0,
        },
        monsterStats,
        topCards,
      });

      addLog(`성공률: ${((s.runStats.successRate ?? 0) * 100).toFixed(1)}%`);
      addLog(`평균 도달 층: ${(s.runStats.avgLayerReached ?? 0).toFixed(1)}`);

    } catch (err) {
      addLog(`오류 발생: ${err instanceof Error ? err.message : String(err)}`);
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [runCount, difficulty, strategy, addLog]);

  return (
    <div>
      <h3 style={STYLES.sectionHeader}>🎮 런 시뮬레이터</h3>

      {/* 설정 섹션 */}
      <div style={STYLES.sectionBox}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <label style={STYLES.label}>런 횟수</label>
            <input
              type="number"
              min={1}
              max={100}
              value={runCount}
              onChange={e => setRunCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input}
              disabled={isRunning}
            />
          </div>
          <div>
            <label style={STYLES.label}>난이도</label>
            <input
              type="number"
              min={1}
              max={5}
              value={difficulty}
              onChange={e => setDifficulty(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              style={STYLES.input}
              disabled={isRunning}
            />
          </div>
          <div>
            <label style={STYLES.label}>전략</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value as 'balanced' | 'aggressive' | 'defensive')}
              style={STYLES.select}
              disabled={isRunning}
            >
              <option value="balanced">균형 (balanced)</option>
              <option value="aggressive">공격적 (aggressive)</option>
              <option value="defensive">방어적 (defensive)</option>
            </select>
          </div>
        </div>

        <button
          onClick={runSimulation}
          style={isRunning ? STYLES.buttonRunning : STYLES.button}
          disabled={isRunning}
        >
          {isRunning ? `시뮬레이션 중... ${progress}%` : '시뮬레이션 실행'}
        </button>

        {isRunning && (
          <div style={STYLES.progressBar}>
            <div style={{ ...STYLES.progressFill, width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* 결과 통계 */}
      {result && (
        <div style={STYLES.sectionBox}>
          <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>📊 결과 통계</h4>
          <div style={STYLES.statsGrid}>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>총 런</div>
              <div style={STYLES.statValue}>{result.runStats.totalRuns}회</div>
            </div>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>성공률</div>
              <div style={STYLES.statValue}>{(result.runStats.successRate * 100).toFixed(1)}%</div>
            </div>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>평균 도달 층</div>
              <div style={STYLES.statValue}>{result.runStats.avgLayerReached.toFixed(1)}</div>
            </div>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>평균 전투 승리</div>
              <div style={STYLES.statValue}>{result.runStats.avgBattlesWon.toFixed(1)}</div>
            </div>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>평균 골드 획득</div>
              <div style={STYLES.statValue}>{result.runStats.avgGoldEarned.toFixed(0)}G</div>
            </div>
            <div style={STYLES.statItem}>
              <div style={STYLES.statLabel}>평균 덱 크기</div>
              <div style={STYLES.statValue}>{result.runStats.avgFinalDeckSize.toFixed(1)}장</div>
            </div>
          </div>

          {/* 상위 사용 카드 */}
          <h4 style={{ margin: '16px 0 8px 0', color: '#3b82f6' }}>🃏 가장 많이 사용한 카드</h4>
          <div style={{ fontSize: '0.875rem' }}>
            {result.topCards.map((card, i) => (
              <div key={card.id} style={{ padding: '4px 0', borderBottom: '1px solid #334155' }}>
                {i + 1}. <strong>{card.id}</strong>: {card.uses}회
              </div>
            ))}
          </div>

          {/* 몬스터 승패 (일부) */}
          <h4 style={{ margin: '16px 0 8px 0', color: '#ef4444' }}>👹 몬스터 전적 (상위 5)</h4>
          <div style={{ fontSize: '0.875rem' }}>
            {Array.from(result.monsterStats.entries())
              .sort((a, b) => b[1].battles - a[1].battles)
              .slice(0, 5)
              .map(([id, stat]) => (
                <div key={id} style={{ padding: '4px 0', borderBottom: '1px solid #334155' }}>
                  <strong>{id}</strong>: {stat.battles}전 {stat.wins}승 {stat.losses}패
                  ({stat.battles > 0 ? ((stat.wins / stat.battles) * 100).toFixed(0) : 0}%)
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 로그 */}
      <div style={STYLES.sectionBox}>
        <h4 style={{ margin: '0 0 8px 0', color: '#94a3b8' }}>📝 로그</h4>
        <div style={STYLES.logBox}>
          {logs.length === 0 ? (
            <div style={{ color: '#64748b' }}>시뮬레이션을 실행하면 로그가 표시됩니다.</div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
});
