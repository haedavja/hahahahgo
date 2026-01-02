/**
 * BalanceTab.tsx
 * 전투 밸런스 시뮬레이터 - 덱/상징/이변별 승률 테스트
 */

import { useState, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';

// 스타일 상수
const STYLES = {
  sectionHeader: { marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' } as CSSProperties,
  sectionBox: {
    padding: '16px',
    background: '#0f172a',
    borderRadius: '8px',
    marginBottom: '16px',
  } as CSSProperties,
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.875rem',
    color: '#cbd5e1',
  } as CSSProperties,
  input: {
    width: '80px',
    padding: '8px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#cbd5e1',
    fontSize: '0.875rem',
  } as CSSProperties,
  select: {
    flex: 1,
    padding: '8px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#cbd5e1',
    fontSize: '0.875rem',
    minWidth: '120px',
  } as CSSProperties,
  button: {
    padding: '8px 16px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  } as CSSProperties,
  buttonRunning: {
    padding: '8px 16px',
    background: '#64748b',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    cursor: 'not-allowed',
  } as CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginTop: '12px',
  } as CSSProperties,
  statItem: {
    padding: '8px',
    background: '#1e293b',
    borderRadius: '6px',
    fontSize: '0.875rem',
  } as CSSProperties,
  statLabel: { color: '#94a3b8', fontSize: '0.75rem' } as CSSProperties,
  statValue: { color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' } as CSSProperties,
  progressBar: {
    height: '4px',
    background: '#334155',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  } as CSSProperties,
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.2s' } as CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
  } as CSSProperties,
  th: {
    textAlign: 'left',
    padding: '6px 8px',
    background: '#1e293b',
    color: '#94a3b8',
    borderBottom: '1px solid #334155',
  } as CSSProperties,
  td: {
    padding: '6px 8px',
    borderBottom: '1px solid #334155',
    color: '#e2e8f0',
  } as CSSProperties,
  scrollBox: { maxHeight: '300px', overflowY: 'auto' } as CSSProperties,
} as const;

// 결과 타입
interface EnemyResult {
  enemyId: string;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgTurns: number;
  avgPlayerDamage: number;
  avgEnemyDamage: number;
}

interface CardUsage {
  cardId: string;
  uses: number;
  avgDamage: number;
}

interface SimulationResult {
  enemies: EnemyResult[];
  cardUsage: CardUsage[];
  overallWinRate: number;
  totalBattles: number;
  avgTurns: number;
}

// 테스트 덱 옵션
const DECK_OPTIONS = [
  { id: 'starter', name: '기본 덱', cards: ['shoot', 'shoot', 'strike', 'strike', 'strike', 'reload', 'quarte', 'octave', 'breach', 'deflect'] },
  { id: 'aggressive', name: '공격 덱', cards: ['shoot', 'shoot', 'shoot', 'strike', 'strike', 'strike', 'reload', 'reload', 'breach', 'breach'] },
  { id: 'defensive', name: '방어 덱', cards: ['shoot', 'strike', 'strike', 'deflect', 'deflect', 'deflect', 'quarte', 'octave', 'reload', 'breach'] },
];

// 적 옵션
const ENEMY_OPTIONS = [
  { id: 'all', name: '전체 (Tier 1-2)' },
  { id: 'ghoul', name: '구울' },
  { id: 'marauder', name: '약탈자' },
  { id: 'wildrat', name: '들쥐' },
  { id: 'berserker', name: '폭주자' },
  { id: 'polluted', name: '오염체' },
  { id: 'deserter', name: '탈영병' },
  { id: 'slurthim', name: '슬러심' },
];

// 이변 옵션
const ANOMALY_OPTIONS = [
  { id: 'none', name: '없음' },
  { id: 'bloodmoon', name: '핏빛 달' },
  { id: 'silence', name: '고요' },
  { id: 'fragility', name: '취약' },
  { id: 'madness', name: '광기' },
];

export const BalanceTab = memo(function BalanceTab() {
  const [battleCount, setBattleCount] = useState(100);
  const [selectedDeck, setSelectedDeck] = useState('starter');
  const [selectedEnemy, setSelectedEnemy] = useState('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState('none');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResult(null);

    try {
      const { createTimelineBattleEngine } = await import('../../../simulator/core/timeline-battle-engine');
      const { syncAllEnemies } = await import('../../../simulator/data/game-data-sync');

      const engine = createTimelineBattleEngine({
        enableCrits: true,
        enableCombos: true,
        enableRelics: true,
        enableAnomalies: selectedAnomaly !== 'none',
        enableTimeline: true,
        verbose: false,
        maxTurns: 30,
      });

      const allEnemies = syncAllEnemies();
      const deck = DECK_OPTIONS.find((d) => d.id === selectedDeck)?.cards || DECK_OPTIONS[0].cards;
      const anomalyConfig = selectedAnomaly !== 'none' ? selectedAnomaly : undefined;

      const enemyIds =
        selectedEnemy === 'all'
          ? ['ghoul', 'marauder', 'wildrat', 'berserker', 'polluted', 'deserter', 'slurthim']
          : [selectedEnemy];

      const enemyResults: EnemyResult[] = [];
      const cardUsageMap: Record<string, { uses: number; totalDamage: number }> = {};
      let totalBattles = 0;
      let totalTurns = 0;

      for (let enemyIdx = 0; enemyIdx < enemyIds.length; enemyIdx++) {
        const enemyId = enemyIds[enemyIdx];
        const enemyData = allEnemies[enemyId];
        if (!enemyData) continue;

        const enemy = {
          id: enemyId,
          name: (enemyData as { name?: string }).name || enemyId,
          hp: (enemyData as { hp?: number; maxHp?: number }).hp || (enemyData as { maxHp?: number }).maxHp || 50,
          maxHp: (enemyData as { maxHp?: number }).maxHp || 50,
          block: 0,
          tokens: {},
          deck: (enemyData as { deck?: string[] }).deck || [],
          tier: (enemyData as { tier?: number }).tier || 1,
          cardsPerTurn: (enemyData as { cardsPerTurn?: number }).cardsPerTurn || 2,
          isBoss: false,
          intent: 'attack' as const,
        };

        let wins = 0,
          losses = 0,
          draws = 0;
        let sumTurns = 0,
          sumPlayerDmg = 0,
          sumEnemyDmg = 0;

        for (let i = 0; i < battleCount; i++) {
          const battleResult = engine.runBattle(
            deck,
            [],
            { ...enemy, hp: enemy.maxHp, block: 0, tokens: {} } as unknown as Parameters<typeof engine.runBattle>[2],
            anomalyConfig
          );

          if (battleResult.winner === 'player') wins++;
          else if (battleResult.winner === 'enemy') losses++;
          else draws++;

          sumTurns += battleResult.turns;
          sumPlayerDmg += battleResult.playerDamageDealt;
          sumEnemyDmg += battleResult.enemyDamageDealt;

          // 카드 사용 통계
          for (const [cardId, count] of Object.entries(battleResult.cardUsage)) {
            if (!cardUsageMap[cardId]) {
              cardUsageMap[cardId] = { uses: 0, totalDamage: 0 };
            }
            cardUsageMap[cardId].uses += count;
          }

          totalBattles++;
          totalTurns += battleResult.turns;

          // 진행률 업데이트
          const overallProgress =
            ((enemyIdx * battleCount + i + 1) / (enemyIds.length * battleCount)) * 100;
          setProgress(Math.round(overallProgress));

          // UI 업데이트를 위한 yield
          if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
        }

        enemyResults.push({
          enemyId,
          wins,
          losses,
          draws,
          winRate: wins / battleCount,
          avgTurns: sumTurns / battleCount,
          avgPlayerDamage: sumPlayerDmg / battleCount,
          avgEnemyDamage: sumEnemyDmg / battleCount,
        });
      }

      // 카드 사용 통계 정리
      const cardUsage: CardUsage[] = Object.entries(cardUsageMap)
        .map(([cardId, data]) => ({
          cardId,
          uses: data.uses,
          avgDamage: data.totalDamage / Math.max(1, data.uses),
        }))
        .sort((a, b) => b.uses - a.uses);

      const totalWins = enemyResults.reduce((sum, e) => sum + e.wins, 0);

      setResult({
        enemies: enemyResults,
        cardUsage,
        overallWinRate: totalWins / totalBattles,
        totalBattles,
        avgTurns: totalTurns / totalBattles,
      });
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsRunning(false);
    }
  }, [battleCount, selectedDeck, selectedEnemy, selectedAnomaly]);

  const getWinRateColor = (rate: number): string => {
    if (rate >= 0.7) return '#22c55e';
    if (rate >= 0.5) return '#fbbf24';
    if (rate >= 0.3) return '#f97316';
    return '#ef4444';
  };

  return (
    <div>
      <h3 style={STYLES.sectionHeader}>⚔️ 전투 밸런스 시뮬레이터</h3>

      {/* 설정 섹션 */}
      <div style={STYLES.sectionBox}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <div>
            <label style={STYLES.label}>전투 수</label>
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={battleCount}
              onChange={(e) => setBattleCount(Math.min(1000, Math.max(10, parseInt(e.target.value) || 10)))}
              style={STYLES.input}
              disabled={isRunning}
            />
          </div>
          <div>
            <label style={STYLES.label}>덱</label>
            <select
              value={selectedDeck}
              onChange={(e) => setSelectedDeck(e.target.value)}
              style={STYLES.select}
              disabled={isRunning}
            >
              {DECK_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={STYLES.label}>적</label>
            <select
              value={selectedEnemy}
              onChange={(e) => setSelectedEnemy(e.target.value)}
              style={STYLES.select}
              disabled={isRunning}
            >
              {ENEMY_OPTIONS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={STYLES.label}>이변</label>
            <select
              value={selectedAnomaly}
              onChange={(e) => setSelectedAnomaly(e.target.value)}
              style={STYLES.select}
              disabled={isRunning}
            >
              {ANOMALY_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={runSimulation}
          style={isRunning ? STYLES.buttonRunning : STYLES.button}
          disabled={isRunning}
        >
          {isRunning ? `시뮬레이션 중... ${progress}%` : '▶ 시뮬레이션 시작'}
        </button>

        {isRunning && (
          <div style={STYLES.progressBar}>
            <div style={{ ...STYLES.progressFill, width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* 결과 표시 */}
      {result && (
        <>
          {/* 요약 통계 */}
          <div style={STYLES.sectionBox}>
            <h4 style={{ margin: '0 0 12px 0', color: '#22c55e' }}>📊 요약</h4>
            <div style={STYLES.statsGrid}>
              <div style={STYLES.statItem}>
                <div style={STYLES.statLabel}>총 전투</div>
                <div style={STYLES.statValue}>{result.totalBattles}회</div>
              </div>
              <div style={STYLES.statItem}>
                <div style={STYLES.statLabel}>전체 승률</div>
                <div style={{ ...STYLES.statValue, color: getWinRateColor(result.overallWinRate) }}>
                  {(result.overallWinRate * 100).toFixed(1)}%
                </div>
              </div>
              <div style={STYLES.statItem}>
                <div style={STYLES.statLabel}>평균 턴</div>
                <div style={STYLES.statValue}>{result.avgTurns.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* 적별 상세 */}
          <div style={STYLES.sectionBox}>
            <h4 style={{ margin: '0 0 12px 0', color: '#ef4444' }}>👹 적별 승률</h4>
            <div style={STYLES.scrollBox}>
              <table style={STYLES.table}>
                <thead>
                  <tr>
                    <th style={STYLES.th}>적</th>
                    <th style={STYLES.th}>승리</th>
                    <th style={STYLES.th}>패배</th>
                    <th style={STYLES.th}>승률</th>
                    <th style={STYLES.th}>평균턴</th>
                    <th style={STYLES.th}>가한 피해</th>
                    <th style={STYLES.th}>받은 피해</th>
                  </tr>
                </thead>
                <tbody>
                  {result.enemies.map((e) => (
                    <tr key={e.enemyId}>
                      <td style={STYLES.td}>{e.enemyId}</td>
                      <td style={STYLES.td}>{e.wins}</td>
                      <td style={STYLES.td}>{e.losses}</td>
                      <td style={{ ...STYLES.td, color: getWinRateColor(e.winRate), fontWeight: 'bold' }}>
                        {(e.winRate * 100).toFixed(1)}%
                      </td>
                      <td style={STYLES.td}>{e.avgTurns.toFixed(1)}</td>
                      <td style={STYLES.td}>{e.avgPlayerDamage.toFixed(0)}</td>
                      <td style={STYLES.td}>{e.avgEnemyDamage.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 카드 사용 통계 */}
          <div style={STYLES.sectionBox}>
            <h4 style={{ margin: '0 0 12px 0', color: '#3b82f6' }}>🃏 카드 사용 통계</h4>
            <div style={STYLES.scrollBox}>
              <table style={STYLES.table}>
                <thead>
                  <tr>
                    <th style={STYLES.th}>카드</th>
                    <th style={STYLES.th}>사용 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cardUsage.slice(0, 15).map((c) => (
                    <tr key={c.cardId}>
                      <td style={STYLES.td}>{c.cardId}</td>
                      <td style={STYLES.td}>{c.uses}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
