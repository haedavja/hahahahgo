/**
 * InsightsSection.tsx
 * 밸런스 인사이트 섹션 - SimulatorTab에서 분리
 */

import { memo, useMemo, type CSSProperties } from 'react';
import { BalanceInsightAnalyzer } from '../../../../simulator/analysis/balance-insights';
import type { DetailedStats } from '../../../../simulator/analysis/detailed-stats';

interface InsightsSectionProps {
  stats: DetailedStats;
  scrollBoxStyle: CSSProperties;
}

export const InsightsSection = memo(function InsightsSection({ stats, scrollBoxStyle }: InsightsSectionProps) {
  const report = useMemo(() => {
    const analyzer = new BalanceInsightAnalyzer(stats);
    return analyzer.generateReport();
  }, [stats]);

  return (
    <>
      <h4 style={{ margin: '0 0 12px 0', color: '#10b981' }}>⚖️ 밸런스 인사이트</h4>
      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
        액션 가능한 밸런스 권장사항, 병목 구간 분석, 필수픽 감지, 다양성 지표
      </p>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <SummaryCard
          label="건강도 점수"
          value={`${report.summary.healthScore}/100`}
          color={report.summary.healthScore >= 70 ? '#22c55e' : report.summary.healthScore >= 40 ? '#f59e0b' : '#ef4444'}
        />
        <SummaryCard label="긴급 이슈" value={`${report.summary.criticalIssues}개`} color="#ef4444" />
        <SummaryCard label="주의 이슈" value={`${report.summary.warningIssues}개`} color="#f59e0b" />
        <SummaryCard
          label="난이도 평가"
          value={getDifficultyLabel(report.playerExperience.overallDifficulty)}
          color="#3b82f6"
          fontSize="1rem"
        />
      </div>

      {/* 최우선 과제 */}
      {report.summary.topPriorities.length > 0 && (
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>🎯 최우선 과제</h5>
          {report.summary.topPriorities.map((p, i) => (
            <div key={i} style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>
              {i + 1}. {p}
            </div>
          ))}
        </div>
      )}

      {/* 긴급 조치 필요 */}
      <RecommendationSection
        title="🔴 긴급 조치 필요"
        titleColor="#ef4444"
        recommendations={report.recommendations.filter(r => r.priority === 'critical')}
        scrollBoxStyle={scrollBoxStyle}
        borderColor="#ef4444"
        badgeColor="#dc2626"
      />

      {/* 주의 필요 */}
      <RecommendationSection
        title="🟡 주의 필요"
        titleColor="#f59e0b"
        recommendations={report.recommendations.filter(r => r.priority === 'warning').slice(0, 8)}
        scrollBoxStyle={scrollBoxStyle}
        borderColor="#f59e0b"
        compact
      />

      {/* 필수픽 경고 */}
      {report.mustPicks.length > 0 && (
        <>
          <h5 style={{ margin: '16px 0 8px 0', color: '#ec4899' }}>⚠️ 필수픽 감지</h5>
          <div style={scrollBoxStyle}>
            {report.mustPicks.map((mp, i) => (
              <div key={i} style={{
                padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px',
                borderLeft: `4px solid ${mp.riskLevel === 'extreme' ? '#ef4444' : mp.riskLevel === 'high' ? '#f59e0b' : '#fbbf24'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#f472b6' }}>{mp.targetName}</span>
                  <span style={{
                    fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', color: '#fff',
                    background: mp.riskLevel === 'extreme' ? '#dc2626' : '#d97706'
                  }}>
                    {mp.riskLevel === 'extreme' ? '극심' : mp.riskLevel === 'high' ? '높음' : '보통'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '4px' }}>
                  보유 승률 <span style={{ color: '#22c55e' }}>{(mp.winRateWith * 100).toFixed(1)}%</span> vs 미보유 <span style={{ color: '#ef4444' }}>{(mp.winRateWithout * 100).toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold' }}>
                  기여도 차이: +{(mp.contributionGap * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 병목 구간 */}
      {report.bottlenecks.length > 0 && (
        <>
          <h5 style={{ margin: '16px 0 8px 0', color: '#a855f7' }}>🚧 병목 구간</h5>
          <div style={scrollBoxStyle}>
            {report.bottlenecks.slice(0, 5).map((bn, i) => (
              <div key={i} style={{
                padding: '10px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px',
                borderLeft: `4px solid ${bn.severity === 'critical' ? '#ef4444' : bn.severity === 'high' ? '#f59e0b' : '#8b5cf6'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#c084fc' }}>{bn.floor}층</span>
                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                    사망률 {(bn.deathRate * 100).toFixed(1)}% (평균의 {bn.deathRateMultiplier.toFixed(1)}배)
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '4px' }}>
                  주요 원인: <span style={{ color: '#f59e0b' }}>{bn.primaryCause.enemyName}</span> ({(bn.primaryCause.deathContribution * 100).toFixed(0)}%)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{bn.causeAnalysis}</div>
                <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '4px' }}>제안: {bn.suggestions[0]}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 다양성 지표 */}
      <h5 style={{ margin: '16px 0 8px 0', color: '#06b6d4' }}>📊 다양성 지표</h5>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <DiversityCard type="카드" diversity={report.diversity.card} />
        <DiversityCard type="상징" diversity={report.diversity.relic} />
      </div>

      {/* 메타 티어 */}
      {report.diversity.card.tierDistribution.filter(t => t.cards.length > 0).length > 0 && (
        <>
          <h5 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>🏆 메타 티어</h5>
          <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '16px' }}>
            {report.diversity.card.tierDistribution.filter(t => t.cards.length > 0).map((tier, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block', width: '32px', fontWeight: 'bold',
                  color: tier.tier === 'S' ? '#ef4444' : tier.tier === 'A' ? '#f59e0b' : tier.tier === 'B' ? '#22c55e' : tier.tier === 'C' ? '#3b82f6' : '#64748b'
                }}>{tier.tier}</span>
                <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                  {tier.cards.slice(0, 6).join(', ')}{tier.cards.length > 6 ? ` 외 ${tier.cards.length - 6}개` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 플레이어 경험 예측 */}
      <PlayerExperienceCard experience={report.playerExperience} />

      {/* 카드 특성 밸런스 */}
      <CardTraitAnalysisSection traitAnalysis={report.cardTraitAnalysis} />

      {/* 성장 스탯 밸런스 */}
      <GrowthStatSection growthAnalysis={report.growthStatAnalysis} />

      {/* 성장 경로 분석 */}
      <GrowthPathSection growthPaths={report.growthPaths} />

      {/* 승급 밸런스 분석 */}
      <UpgradeBalanceSection upgradeBalance={report.upgradeBalance} />
    </>
  );
});

// Helper Components
function SummaryCard({ label, value, color, fontSize = '1.5rem' }: { label: string; value: string; color: string; fontSize?: string }) {
  return (
    <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize, fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    balanced: '균형', too_easy: '너무 쉬움', easy: '쉬움', hard: '어려움', too_hard: '매우 어려움'
  };
  return labels[difficulty] || difficulty;
}

interface RecommendationSectionProps {
  title: string;
  titleColor: string;
  recommendations: Array<{
    targetName: string;
    targetType: string;
    issue: string;
    issueType?: string;
    suggestion: string;
    estimatedImpact?: number;
    confidence: number;
  }>;
  scrollBoxStyle: CSSProperties;
  borderColor: string;
  badgeColor?: string;
  compact?: boolean;
}

function RecommendationSection({ title, titleColor, recommendations, scrollBoxStyle, borderColor, badgeColor, compact }: RecommendationSectionProps) {
  if (recommendations.length === 0) return null;

  return (
    <>
      <h5 style={{ margin: compact ? '16px 0 8px 0' : '0 0 8px 0', color: titleColor }}>{title}</h5>
      <div style={scrollBoxStyle}>
        {recommendations.map((rec, i) => (
          <div key={i} style={{
            padding: compact ? '8px' : '10px', background: '#1e293b', borderRadius: '6px',
            marginBottom: compact ? '6px' : '8px', borderLeft: `${compact ? 3 : 4}px solid ${borderColor}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? 0 : '4px' }}>
              <span style={{ fontSize: compact ? '0.8rem' : '0.875rem', fontWeight: 'bold', color: '#fbbf24' }}>{rec.targetName}</span>
              {badgeColor && (
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: badgeColor, borderRadius: '4px', color: '#fff' }}>{rec.targetType}</span>
              )}
              {compact && <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{rec.issueType}</span>}
            </div>
            {compact ? (
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{rec.issue} → {rec.suggestion}</div>
            ) : (
              <>
                <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '4px' }}>{rec.issue}</div>
                <div style={{ fontSize: '0.875rem', color: '#e2e8f0', marginBottom: '4px' }}>💡 {rec.suggestion}</div>
                {rec.estimatedImpact && (
                  <div style={{ fontSize: '0.75rem', color: '#06b6d4' }}>
                    예상 영향: 승률 {rec.estimatedImpact > 0 ? '+' : ''}{(rec.estimatedImpact * 100).toFixed(1)}%
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>신뢰도: {(rec.confidence * 100).toFixed(0)}%</div>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface DiversityData {
  giniCoefficient: number;
  top10PercentShare: number;
  unusedCount: number;
  healthRating: 'healthy' | 'imbalanced' | 'critical';
}

function DiversityCard({ type, diversity }: { type: string; diversity: DiversityData }) {
  const healthColor = diversity.healthRating === 'healthy' ? '#22c55e' : diversity.healthRating === 'imbalanced' ? '#f59e0b' : '#ef4444';
  const healthBg = diversity.healthRating === 'healthy' ? 'rgba(34, 197, 94, 0.2)' : diversity.healthRating === 'imbalanced' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const healthLabel = diversity.healthRating === 'healthy' ? '✅ 건강' : diversity.healthRating === 'imbalanced' ? '⚠️ 불균형' : '🔴 심각';

  return (
    <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>{type} 다양성</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>Gini 계수</span>
        <span style={{
          fontSize: '0.8rem', fontWeight: 'bold',
          color: diversity.giniCoefficient < 0.4 ? '#22c55e' : diversity.giniCoefficient < 0.6 ? '#f59e0b' : '#ef4444'
        }}>{diversity.giniCoefficient.toFixed(3)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>상위 10% 점유율</span>
        <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{(diversity.top10PercentShare * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>미사용 {type}</span>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{diversity.unusedCount}개</span>
      </div>
      <div style={{ marginTop: '8px', padding: '4px 8px', background: healthBg, borderRadius: '4px', textAlign: 'center', fontSize: '0.75rem', color: healthColor }}>
        {healthLabel}
      </div>
    </div>
  );
}

interface PlayerExperience {
  difficultyScore: number;
  newPlayerDropoutRate: number;
  veteranSatisfactionScore: number;
  overallAssessment: string;
  improvementPriorities: string[];
}

function PlayerExperienceCard({ experience }: { experience: PlayerExperience }) {
  return (
    <>
      <h5 style={{ margin: '0 0 8px 0', color: '#8b5cf6' }}>🎮 플레이어 경험 예측</h5>
      <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>난이도 점수</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8b5cf6' }}>{experience.difficultyScore}/10</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>신규 이탈률</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: experience.newPlayerDropoutRate > 0.5 ? '#ef4444' : '#22c55e' }}>
              {(experience.newPlayerDropoutRate * 100).toFixed(0)}%
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>숙련자 만족도</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e' }}>{experience.veteranSatisfactionScore}/10</div>
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: '#e2e8f0', padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px' }}>
          {experience.overallAssessment}
        </div>
        {experience.improvementPriorities.length > 0 && (
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#22c55e' }}>
            개선 우선순위: {experience.improvementPriorities.join(' → ')}
          </div>
        )}
      </div>
    </>
  );
}

interface TraitStat {
  traitName: string;
  cardCount: number;
  avgContribution: number;
  rating: string;
}

interface CardTraitAnalysis {
  traitStats: TraitStat[];
  diversityScore: number;
  overpoweredTraits: TraitStat[];
  underpoweredTraits: TraitStat[];
}

function CardTraitAnalysisSection({ traitAnalysis }: { traitAnalysis: CardTraitAnalysis }) {
  return (
    <>
      <h5 style={{ margin: '16px 0 8px 0', color: '#a855f7' }}>🎴 카드 특성 밸런스</h5>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>특성별 승률 기여도</div>
          {traitAnalysis.traitStats.slice(0, 6).map((trait, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{trait.traitName} ({trait.cardCount}장)</span>
              <span style={{
                fontSize: '0.8rem', fontWeight: 'bold',
                color: trait.rating === 'overpowered' ? '#ef4444' : trait.rating === 'balanced' ? '#22c55e' : trait.rating === 'underpowered' ? '#f59e0b' : '#64748b'
              }}>
                {trait.avgContribution >= 0 ? '+' : ''}{(trait.avgContribution * 100).toFixed(1)}%
              </span>
            </div>
          ))}
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>특성 다양성: {(traitAnalysis.diversityScore * 100).toFixed(0)}%</div>
        </div>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>특성 밸런스 이슈</div>
          {traitAnalysis.overpoweredTraits.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 'bold' }}>🔴 과잉 강화</div>
              {traitAnalysis.overpoweredTraits.slice(0, 3).map((t, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: '#f87171' }}>{t.traitName}: +{(t.avgContribution * 100).toFixed(0)}%</div>
              ))}
            </div>
          )}
          {traitAnalysis.underpoweredTraits.length > 0 && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold' }}>🟡 약한 특성</div>
              {traitAnalysis.underpoweredTraits.slice(0, 3).map((t, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{t.traitName}: {(t.avgContribution * 100).toFixed(0)}%</div>
              ))}
            </div>
          )}
          {traitAnalysis.overpoweredTraits.length === 0 && traitAnalysis.underpoweredTraits.length === 0 && (
            <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>✓ 특성 밸런스 양호</div>
          )}
        </div>
      </div>
    </>
  );
}

interface StatContribution {
  statName: string;
  winCorrelation: number;
  rating: string;
}

interface PhilosophyData {
  avgLevel: number;
  winCorrelation: number;
}

interface GrowthStatAnalysis {
  statContributions: StatContribution[];
  diversityScore: number;
  philosophyBalance: {
    ethos: PhilosophyData;
    pathos: PhilosophyData;
    logos: PhilosophyData;
  };
  mustHaveStats: Array<{ statName: string; contributionGap: number; winRateWith: number; winRateWithout: number }>;
}

function GrowthStatSection({ growthAnalysis }: { growthAnalysis: GrowthStatAnalysis }) {
  return (
    <>
      <h5 style={{ margin: '16px 0 8px 0', color: '#ec4899' }}>🧬 성장 스탯 밸런스</h5>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>스탯별 승률 기여도</div>
          {growthAnalysis.statContributions.slice(0, 6).map((stat, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{stat.statName}</span>
              <span style={{
                fontSize: '0.8rem', fontWeight: 'bold',
                color: stat.rating === 'overpowered' ? '#ef4444' : stat.rating === 'balanced' ? '#22c55e' : stat.rating === 'underpowered' ? '#f59e0b' : '#64748b'
              }}>
                {stat.winCorrelation >= 0 ? '+' : ''}{(stat.winCorrelation * 100).toFixed(1)}%
              </span>
            </div>
          ))}
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '8px' }}>다양성 점수: {(growthAnalysis.diversityScore * 100).toFixed(0)}%</div>
        </div>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>철학 분기 밸런스</div>
          {[
            { name: '에토스', data: growthAnalysis.philosophyBalance.ethos, color: '#3b82f6' },
            { name: '파토스', data: growthAnalysis.philosophyBalance.pathos, color: '#ef4444' },
            { name: '로고스', data: growthAnalysis.philosophyBalance.logos, color: '#22c55e' },
          ].map((phil, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: phil.color, fontWeight: 'bold' }}>{phil.name}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>평균 레벨: {phil.data.avgLevel.toFixed(1)}</div>
                <div style={{ fontSize: '0.75rem', color: phil.data.winCorrelation > 0 ? '#22c55e' : '#ef4444' }}>
                  승률: {phil.data.winCorrelation >= 0 ? '+' : ''}{(phil.data.winCorrelation * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {growthAnalysis.mustHaveStats.length > 0 && (
        <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px', marginBottom: '16px', borderLeft: '4px solid #ec4899' }}>
          <div style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 필수 스탯 감지</div>
          {growthAnalysis.mustHaveStats.map((stat, i) => (
            <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
              {stat.statName}: 기여도 +{(stat.contributionGap * 100).toFixed(0)}% (보유 {(stat.winRateWith * 100).toFixed(0)}% vs 미보유 {(stat.winRateWithout * 100).toFixed(0)}%)
            </div>
          ))}
        </div>
      )}
    </>
  );
}

interface GrowthPath {
  path: string;
  winRate: number;
  description?: string;
  issue?: string;
  suggestion?: string;
}

interface GrowthPaths {
  optimalPaths: GrowthPath[];
  riskyPaths: GrowthPath[];
  pathDiversity: { uniquePaths: number; giniCoefficient: number };
}

function GrowthPathSection({ growthPaths }: { growthPaths: GrowthPaths }) {
  return (
    <>
      <h5 style={{ margin: '16px 0 8px 0', color: '#14b8a6' }}>🌱 성장 경로 분석</h5>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>최적 성장 경로 TOP 5</div>
          {growthPaths.optimalPaths.length > 0 ? (
            growthPaths.optimalPaths.map((path, i) => (
              <div key={i} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(20, 184, 166, 0.1)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#5eead4', fontWeight: 'bold' }}>{i + 1}. {path.path}</span>
                  <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>{(path.winRate * 100).toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{path.description}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>데이터 부족</div>
          )}
        </div>
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>위험 성장 경로</div>
          {growthPaths.riskyPaths.length > 0 ? (
            growthPaths.riskyPaths.map((path, i) => (
              <div key={i} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#f87171' }}>{path.path}</span>
                  <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>{(path.winRate * 100).toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{path.issue}</div>
                <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>💡 {path.suggestion}</div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>위험 경로 없음</div>
          )}
          <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#64748b' }}>
            경로 다양성: {growthPaths.pathDiversity.uniquePaths}개 고유 경로, Gini: {growthPaths.pathDiversity.giniCoefficient.toFixed(3)}
          </div>
        </div>
      </div>
    </>
  );
}

interface UpgradeBalance {
  overall: {
    totalUpgrades: number;
    avgUpgradesPerRun: number;
    upgradeWinCorrelation: number;
    optimalUpgradeCount: number;
  };
  priorityRecommendations: Array<{ rank: number; cardName: string; reason: string }>;
  overUpgraded: Array<{ cardName: string; upgradeCount: number; suggestion: string }>;
  underUpgraded: Array<{ cardName: string; upgradeCount: number; suggestion: string }>;
}

function UpgradeBalanceSection({ upgradeBalance }: { upgradeBalance: UpgradeBalance }) {
  return (
    <>
      <h5 style={{ margin: '16px 0 8px 0', color: '#f59e0b' }}>⬆️ 승급 밸런스</h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <SummaryCard label="총 승급" value={String(upgradeBalance.overall.totalUpgrades)} color="#f59e0b" fontSize="1.25rem" />
        <SummaryCard label="런당 평균" value={upgradeBalance.overall.avgUpgradesPerRun.toFixed(1)} color="#e2e8f0" fontSize="1.25rem" />
        <SummaryCard
          label="승률 상관"
          value={`${upgradeBalance.overall.upgradeWinCorrelation >= 0 ? '+' : ''}${(upgradeBalance.overall.upgradeWinCorrelation * 100).toFixed(0)}%`}
          color={upgradeBalance.overall.upgradeWinCorrelation > 0 ? '#22c55e' : '#ef4444'}
          fontSize="1.25rem"
        />
        <SummaryCard label="최적 횟수" value={String(upgradeBalance.overall.optimalUpgradeCount)} color="#3b82f6" fontSize="1.25rem" />
      </div>

      {upgradeBalance.priorityRecommendations.length > 0 && (
        <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>🎯 승급 우선순위 권장</div>
          {upgradeBalance.priorityRecommendations.map((rec, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', color: '#fbbf24' }}>{rec.rank}. {rec.cardName}</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.reason}</span>
            </div>
          ))}
        </div>
      )}

      {(upgradeBalance.overUpgraded.length > 0 || upgradeBalance.underUpgraded.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {upgradeBalance.overUpgraded.length > 0 && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>⬇️ 과다 승급 (비효율)</div>
              {upgradeBalance.overUpgraded.slice(0, 3).map((card, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{card.cardName} ({card.upgradeCount}회) - {card.suggestion}</div>
              ))}
            </div>
          )}
          {upgradeBalance.underUpgraded.length > 0 && (
            <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
              <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 'bold', marginBottom: '4px' }}>⬆️ 과소 승급 (기회손실)</div>
              {upgradeBalance.underUpgraded.slice(0, 3).map((card, i) => (
                <div key={i} style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{card.cardName} ({card.upgradeCount}회) - {card.suggestion}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default InsightsSection;
