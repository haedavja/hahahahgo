/**
 * AdvancedTab.tsx
 * 고급 분석 탭 - 시너지, 기여도, AI분석, 인사이트
 * StatsWidget에서 분리됨
 *
 * 번들 최적화: balance-insights 모듈은 동적 import로 지연 로드됩니다.
 */

import { useState, useEffect, memo } from 'react';
import type { CSSProperties } from 'react';
import type { StatsAnalysisResult } from '../../../../simulator/analysis/stats-analysis-framework';
import type { BalanceInsightReport } from '../../../../simulator/analysis/balance-insights';
import type { DetailedStats } from '../../../../simulator/analysis/detailed-stats-types';
import { StatRow, SECTION_TITLE_STYLE, STAT_ROW_STYLE } from '../../../stats';

type SubTabType = 'synergy' | 'contribution' | 'analysis' | 'insights';

interface AdvancedTabProps {
  detailed: DetailedStats;
}

const getSubTabStyle = (active: boolean): CSSProperties => ({
  padding: '4px 8px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  background: active ? '#3b82f6' : '#334155',
  color: active ? '#fff' : '#94a3b8',
});

export const AdvancedTab = memo(function AdvancedTab({ detailed }: AdvancedTabProps) {
  const [subTab, setSubTab] = useState<SubTabType>('synergy');
  const [insightReport, setInsightReport] = useState<BalanceInsightReport | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StatsAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // AI분석 탭 선택 시에만 stats-analysis-framework 모듈 로드
  useEffect(() => {
    if (subTab !== 'analysis') return;
    let cancelled = false;
    setAnalysisLoading(true);

    import('../../../../simulator/analysis/stats-analysis-framework').then(({ analyzeStats }) => {
      if (cancelled) return;
      setAnalysis(analyzeStats(detailed));
      setAnalysisLoading(false);
    });

    return () => { cancelled = true; };
  }, [subTab, detailed]);

  // 인사이트 탭 선택 시에만 balance-insights 모듈 로드
  useEffect(() => {
    if (subTab !== 'insights') return;
    let cancelled = false;
    setInsightsLoading(true);

    import('../../../../simulator/analysis/balance-insights').then(({ BalanceInsightAnalyzer }) => {
      if (cancelled) return;
      const analyzer = new BalanceInsightAnalyzer(detailed);
      setInsightReport(analyzer.generateReport());
      setInsightsLoading(false);
    });

    return () => { cancelled = true; };
  }, [subTab, detailed]);

  return (
    <>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
        <button onClick={() => setSubTab('synergy')} style={getSubTabStyle(subTab === 'synergy')}>시너지</button>
        <button onClick={() => setSubTab('contribution')} style={getSubTabStyle(subTab === 'contribution')}>기여도</button>
        <button onClick={() => setSubTab('analysis')} style={getSubTabStyle(subTab === 'analysis')}>AI분석</button>
        <button onClick={() => setSubTab('insights')} style={getSubTabStyle(subTab === 'insights')}>인사이트</button>
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
          {analysisLoading || !analysis ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              AI 분석 중...
            </div>
          ) : (
            <>
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
        </>
      )}

      {/* 밸런스 인사이트 */}
      {subTab === 'insights' && (
        <>
          <h3 style={{ ...SECTION_TITLE_STYLE, color: '#10b981' }}>⚖️ 밸런스 인사이트</h3>

          {insightsLoading || !insightReport ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
              인사이트 분석 중...
            </div>
          ) : (
            <>
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
      )}
    </>
  );
});

export default AdvancedTab;
