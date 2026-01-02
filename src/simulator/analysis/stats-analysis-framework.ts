/**
 * @file stats-analysis-framework.ts
 * @description AI 통계 분석 프레임워크
 *
 * AI가 시뮬레이션 통계를 분석할 때 사용하는 정형화된 분석 가이드라인.
 * 단순히 "보스가 강하다 → 너프" 가 아니라,
 * "왜 강한지, 플레이어의 어떤 부분이 취약한지"를 우선적으로 분석합니다.
 */

import type { DetailedStats, MonsterBattleStats, CardEffectStats } from './detailed-stats-types';

// ==================== 분석 결과 타입 ====================

export interface AnalysisResult {
  /** 분석 요약 */
  summary: string;
  /** 핵심 문제점들 */
  problems: Problem[];
  /** 원인 분석 */
  rootCauses: RootCause[];
  /** 개선 제안 */
  recommendations: Recommendation[];
  /** 추가 조사 필요 항목 */
  needsInvestigation: string[];
}

export interface Problem {
  /** 문제 카테고리 */
  category: 'balance' | 'design' | 'synergy' | 'progression' | 'player_weakness';
  /** 문제 설명 */
  description: string;
  /** 심각도 (1-5) */
  severity: number;
  /** 관련 데이터 */
  relatedData: Record<string, unknown>;
}

export interface RootCause {
  /** 문제 참조 인덱스 */
  problemIndex: number;
  /** 원인 유형 */
  type: 'insufficient_options' | 'stat_mismatch' | 'synergy_gap' | 'tempo_issue' | 'resource_shortage';
  /** 원인 설명 */
  description: string;
  /** 근거 데이터 */
  evidence: string[];
}

export interface Recommendation {
  /** 추천 유형 */
  type: 'buff_card' | 'nerf_enemy' | 'add_option' | 'adjust_curve' | 'improve_synergy';
  /** 대상 */
  target: string;
  /** 제안 내용 */
  suggestion: string;
  /** 예상 효과 */
  expectedImpact: string;
  /** 우선순위 (1-5) */
  priority: number;
}

// ==================== 분석 임계값 ====================

export const THRESHOLDS = {
  /** 적 승률 이상치 (이 이하면 너무 쉬움) */
  ENEMY_WIN_RATE_TOO_EASY: 0.9,
  /** 적 승률 이상치 (이 이하면 너무 어려움) */
  ENEMY_WIN_RATE_TOO_HARD: 0.4,
  /** 카드 픽률 이상치 (이 이상이면 필수픽) */
  CARD_PICK_RATE_MUST_PICK: 0.8,
  /** 카드 픽률 이상치 (이 이하면 버림픽) */
  CARD_PICK_RATE_NEVER_PICK: 0.1,
  /** 카드 기여도 유의미 범위 */
  CARD_CONTRIBUTION_SIGNIFICANT: 0.05,
  /** 런 성공률 목표 */
  TARGET_SUCCESS_RATE: 0.5,
  /** 층별 사망 집중도 (특정 층에 X% 이상 사망이면 문제) */
  DEATH_CONCENTRATION: 0.3,
  /** 시너지 유효 빈도 (이 이상 등장해야 분석) */
  SYNERGY_MIN_FREQUENCY: 3,
};

// ==================== 분석 함수들 ====================

/**
 * 적 밸런스 분석
 * 단순히 "승률이 낮다"가 아니라 "왜 어려운지" 분석
 */
export function analyzeEnemyBalance(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];

  for (const [enemyId, enemyStats] of stats.monsterStats) {
    const winRate = enemyStats.winRate;

    if (winRate < THRESHOLDS.ENEMY_WIN_RATE_TOO_HARD) {
      // 왜 어려운지 분석
      const avgDamageTaken = enemyStats.avgDamageTaken;
      const avgDamageDealt = enemyStats.avgDamageDealt;
      const avgTurns = enemyStats.avgTurns;

      let reason = '';
      if (avgDamageTaken > avgDamageDealt * 1.5) {
        reason = '플레이어 딜량 부족 - 방어에 치중하다 딜 부족으로 장기전 손해';
      } else if (avgTurns > 10) {
        reason = '전투 장기화 - 콤보/시너지 부족으로 턴당 딜이 낮음';
      } else if (avgTurns < 4) {
        reason = '초반 폭딜 당함 - 초반 방어 옵션 또는 선딜 카드 부족';
      } else {
        reason = '전반적 스탯 열세 - 카드 풀 또는 덱 빌딩 문제';
      }

      problems.push({
        category: 'player_weakness',
        description: `${enemyId} 전투 승률 ${(winRate * 100).toFixed(1)}% (목표 50%+): ${reason}`,
        severity: winRate < 0.3 ? 5 : winRate < 0.4 ? 4 : 3,
        relatedData: {
          enemyId,
          winRate,
          avgDamageTaken,
          avgDamageDealt,
          avgTurns,
        },
      });
    } else if (winRate > THRESHOLDS.ENEMY_WIN_RATE_TOO_EASY) {
      problems.push({
        category: 'balance',
        description: `${enemyId} 전투가 너무 쉬움 (승률 ${(winRate * 100).toFixed(1)}%)`,
        severity: 2,
        relatedData: { enemyId, winRate },
      });
    }
  }

  return problems;
}

/**
 * 카드 밸런스 분석
 * 픽률, 기여도, 사용량을 종합 분석
 */
export function analyzeCardBalance(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const pickStats = stats.cardPickStats;
  const contribStats = stats.cardContributionStats;

  if (!pickStats || !contribStats) return problems;

  for (const [cardId, offered] of Object.entries(pickStats.timesOffered)) {
    const pickRate = pickStats.pickRate[cardId] || 0;
    const contribution = contribStats.contribution[cardId] || 0;
    const runsWithCard = contribStats.runsWithCard[cardId] || 0;

    // 필수픽 카드 분석
    if (pickRate > THRESHOLDS.CARD_PICK_RATE_MUST_PICK && runsWithCard >= 3) {
      if (contribution > THRESHOLDS.CARD_CONTRIBUTION_SIGNIFICANT) {
        problems.push({
          category: 'balance',
          description: `${cardId} 필수픽 문제 - 픽률 ${(pickRate * 100).toFixed(1)}%, 기여도 +${(contribution * 100).toFixed(1)}%`,
          severity: 4,
          relatedData: {
            cardId,
            pickRate,
            contribution,
            reason: '대안 카드가 부족하거나 카드 자체가 너무 강함',
          },
        });
      } else {
        problems.push({
          category: 'design',
          description: `${cardId} 과대평가 - 픽률 ${(pickRate * 100).toFixed(1)}%지만 기여도 ${(contribution * 100).toFixed(1)}%`,
          severity: 2,
          relatedData: {
            cardId,
            pickRate,
            contribution,
            reason: 'AI가 실제 가치보다 높게 평가 중, 또는 다른 카드들이 시너지 제공',
          },
        });
      }
    }

    // 버림픽 카드 분석
    if (pickRate < THRESHOLDS.CARD_PICK_RATE_NEVER_PICK && (offered as number) >= 5) {
      problems.push({
        category: 'balance',
        description: `${cardId} 버림픽 - 픽률 ${(pickRate * 100).toFixed(1)}%`,
        severity: 3,
        relatedData: {
          cardId,
          pickRate,
          contribution,
          reason: '카드 효용이 낮거나 현재 메타에서 역할이 불분명',
        },
      });
    }
  }

  return problems;
}

/**
 * 진행 곡선 분석
 * 어느 층에서 막히는지, 왜 막히는지 분석
 */
export function analyzeProgressionCurve(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const deathByLayer = stats.runStats.deathByLayer || {};
  const totalDeaths = Object.values(deathByLayer).reduce((sum, count) => sum + count, 0);

  if (totalDeaths === 0) return problems;

  // 특정 층에 사망 집중 분석
  for (const [layer, count] of Object.entries(deathByLayer)) {
    const deathRate = count / totalDeaths;
    if (deathRate > THRESHOLDS.DEATH_CONCENTRATION) {
      // 해당 층에서 왜 죽는지 분석
      let analysis = '';
      const layerNum = Number(layer);

      if (layerNum <= 3) {
        analysis = '초반 덱 빌딩 실패 - 시작 덱이 너무 약하거나 첫 전투 적이 너무 강함';
      } else if (layerNum >= 8) {
        analysis = '후반 스케일링 부족 - 덱이 충분히 강해지지 못했거나 보스급 적 대응력 부족';
      } else {
        analysis = '중반 전환기 문제 - 핵심 시너지 완성 전 고급 적 등장';
      }

      problems.push({
        category: 'progression',
        description: `${layer}층에서 사망 집중 (${(deathRate * 100).toFixed(1)}%): ${analysis}`,
        severity: deathRate > 0.5 ? 5 : 4,
        relatedData: { layer, count, deathRate, analysis },
      });
    }
  }

  return problems;
}

/**
 * 시너지 분석
 * 어떤 조합이 효과적인지, 누락된 시너지는 무엇인지
 */
export function analyzeSynergies(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const synergyStats = stats.cardSynergyStats;

  if (!synergyStats?.topSynergies) return problems;

  // 압도적 시너지 찾기
  const highWinRateSynergies = synergyStats.topSynergies
    .filter(s => s.frequency >= THRESHOLDS.SYNERGY_MIN_FREQUENCY && s.winRate > 0.7);

  if (highWinRateSynergies.length > 0) {
    const topSynergy = highWinRateSynergies[0];
    problems.push({
      category: 'synergy',
      description: `${topSynergy.pair} 조합이 압도적 (${(topSynergy.winRate * 100).toFixed(1)}% 승률) - 다른 빌드 경로가 약함`,
      severity: 3,
      relatedData: {
        pair: topSynergy.pair,
        winRate: topSynergy.winRate,
        frequency: topSynergy.frequency,
        reason: '이 조합 외에 경쟁력 있는 빌드 경로가 부족',
      },
    });
  }

  // 낮은 승률 시너지
  const lowWinRateSynergies = synergyStats.topSynergies
    .filter(s => s.frequency >= THRESHOLDS.SYNERGY_MIN_FREQUENCY && s.winRate < 0.3);

  for (const syn of lowWinRateSynergies) {
    problems.push({
      category: 'synergy',
      description: `${syn.pair} 조합이 함정 (${(syn.winRate * 100).toFixed(1)}% 승률)`,
      severity: 2,
      relatedData: {
        pair: syn.pair,
        winRate: syn.winRate,
        frequency: syn.frequency,
        reason: '이 조합은 겉보기와 달리 효과적이지 않음',
      },
    });
  }

  return problems;
}

/**
 * 성장 경로 분석
 */
export function analyzeGrowthPaths(stats: DetailedStats): Problem[] {
  const problems: Problem[] = [];
  const growthStats = stats.growthStats;

  if (!growthStats?.growthPathStats || growthStats.growthPathStats.length === 0) {
    return problems;
  }

  // 지배적 성장 경로
  const bestPath = growthStats.growthPathStats[0];
  const worstPath = growthStats.growthPathStats[growthStats.growthPathStats.length - 1];

  if (bestPath && worstPath && bestPath.winRate - worstPath.winRate > 0.3) {
    problems.push({
      category: 'design',
      description: `성장 경로 불균형 - ${bestPath.path} (${(bestPath.winRate * 100).toFixed(1)}%) vs ${worstPath.path} (${(worstPath.winRate * 100).toFixed(1)}%)`,
      severity: 3,
      relatedData: { bestPath, worstPath },
    });
  }

  return problems;
}

// ==================== 종합 분석 ====================

/**
 * 전체 통계 종합 분석
 */
export function analyzeStats(stats: DetailedStats): AnalysisResult {
  const allProblems: Problem[] = [
    ...analyzeEnemyBalance(stats),
    ...analyzeCardBalance(stats),
    ...analyzeProgressionCurve(stats),
    ...analyzeSynergies(stats),
    ...analyzeGrowthPaths(stats),
  ];

  // 심각도 순 정렬
  allProblems.sort((a, b) => b.severity - a.severity);

  // 원인 분석
  const rootCauses: RootCause[] = allProblems.slice(0, 5).map((problem, index) => {
    let type: RootCause['type'] = 'stat_mismatch';
    let description = '';

    switch (problem.category) {
      case 'player_weakness':
        type = 'insufficient_options';
        description = `플레이어 카드 풀에서 ${problem.relatedData.enemyId} 대응 옵션 부족`;
        break;
      case 'balance':
        type = 'stat_mismatch';
        description = `${problem.relatedData.cardId || problem.relatedData.enemyId}의 스탯이 목표 밸런스와 불일치`;
        break;
      case 'synergy':
        type = 'synergy_gap';
        description = '빌드 다양성 부족으로 특정 조합에 의존';
        break;
      case 'progression':
        type = 'tempo_issue';
        description = '덱 성장 곡선과 적 강화 곡선 불일치';
        break;
      default:
        type = 'stat_mismatch';
        description = '밸런스 조정 필요';
    }

    return {
      problemIndex: index,
      type,
      description,
      evidence: [problem.description],
    };
  });

  // 개선 제안
  const recommendations: Recommendation[] = allProblems.slice(0, 5).map((problem, index) => {
    let type: Recommendation['type'] = 'adjust_curve';
    let suggestion = '';
    let expectedImpact = '';

    switch (problem.category) {
      case 'player_weakness':
        type = 'add_option';
        suggestion = `${problem.relatedData.enemyId} 대응용 카드 추가 또는 기존 카드 버프`;
        expectedImpact = '해당 전투 승률 10-15% 상승 예상';
        break;
      case 'balance':
        if ((problem.relatedData.pickRate as number) > 0.8) {
          type = 'buff_card';
          suggestion = `${problem.relatedData.cardId}의 대안 카드들을 버프하거나 새 옵션 추가`;
          expectedImpact = '픽률 분산으로 빌드 다양성 증가';
        } else {
          type = 'buff_card';
          suggestion = `${problem.relatedData.cardId} 효용 증가 필요`;
          expectedImpact = '픽률 상승으로 카드 활용도 정상화';
        }
        break;
      case 'synergy':
        type = 'improve_synergy';
        suggestion = '대체 시너지 경로 강화 또는 새 조합 추가';
        expectedImpact = '빌드 다양성 증가';
        break;
      case 'progression':
        type = 'adjust_curve';
        suggestion = `${problem.relatedData.layer}층 전후 난이도 곡선 조정`;
        expectedImpact = '해당 구간 사망률 감소';
        break;
      default:
        type = 'adjust_curve';
        suggestion = '전반적 밸런스 검토';
        expectedImpact = '게임 경험 개선';
    }

    return {
      type,
      target: (problem.relatedData.cardId || problem.relatedData.enemyId || problem.relatedData.layer || '전반') as string,
      suggestion,
      expectedImpact,
      priority: Math.min(5, 6 - index),
    };
  });

  // 추가 조사 필요 항목
  const needsInvestigation: string[] = [];
  if (stats.runStats.successRate < 0.3) {
    needsInvestigation.push('전반적인 난이도가 너무 높음 - 초보 플레이어 경험 확인 필요');
  }
  if (stats.runStats.successRate > 0.8) {
    needsInvestigation.push('전반적인 난이도가 너무 낮음 - 고수 플레이어 도전 요소 확인 필요');
  }
  if (stats.cardStats.size < 10) {
    needsInvestigation.push('사용 카드 다양성 부족 - 더 많은 런 샘플 필요');
  }

  // 요약 생성
  const criticalProblems = allProblems.filter(p => p.severity >= 4);
  const summary = criticalProblems.length > 0
    ? `${criticalProblems.length}개의 심각한 문제 발견: ${criticalProblems.map(p => p.description.split(':')[0]).join(', ')}`
    : allProblems.length > 0
      ? `${allProblems.length}개의 개선 포인트 발견`
      : '주요 문제 없음 - 밸런스 양호';

  return {
    summary,
    problems: allProblems,
    rootCauses,
    recommendations,
    needsInvestigation,
  };
}

// ==================== AI 분석 가이드라인 출력 ====================

/**
 * AI를 위한 분석 가이드라인 텍스트 생성
 */
export function generateAnalysisGuidelines(stats: DetailedStats): string {
  const analysis = analyzeStats(stats);
  const lines: string[] = [];

  lines.push('# 시뮬레이션 분석 리포트');
  lines.push('');
  lines.push('## 요약');
  lines.push(analysis.summary);
  lines.push('');

  if (analysis.problems.length > 0) {
    lines.push('## 문제점 분석');
    lines.push('');
    lines.push('아래 문제들은 심각도 순으로 정렬되어 있습니다.');
    lines.push('');

    analysis.problems.forEach((problem, i) => {
      lines.push(`### ${i + 1}. [${problem.category.toUpperCase()}] 심각도 ${problem.severity}/5`);
      lines.push(problem.description);
      lines.push('');
    });
  }

  if (analysis.rootCauses.length > 0) {
    lines.push('## 원인 분석');
    lines.push('');
    lines.push('문제의 근본 원인을 파악하여 표면적 증상이 아닌 핵심을 해결합니다.');
    lines.push('');

    analysis.rootCauses.forEach((cause) => {
      lines.push(`- **${cause.type}**: ${cause.description}`);
      cause.evidence.forEach(e => lines.push(`  - 근거: ${e}`));
    });
    lines.push('');
  }

  if (analysis.recommendations.length > 0) {
    lines.push('## 개선 권장사항');
    lines.push('');
    lines.push('우선순위가 높은 순서대로 나열됩니다.');
    lines.push('');

    analysis.recommendations.forEach((rec, i) => {
      lines.push(`### ${i + 1}. [우선순위 ${rec.priority}] ${rec.target}`);
      lines.push(`- 유형: ${rec.type}`);
      lines.push(`- 제안: ${rec.suggestion}`);
      lines.push(`- 예상 효과: ${rec.expectedImpact}`);
      lines.push('');
    });
  }

  if (analysis.needsInvestigation.length > 0) {
    lines.push('## 추가 조사 필요');
    lines.push('');
    analysis.needsInvestigation.forEach(item => {
      lines.push(`- ${item}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## AI 분석 가이드라인');
  lines.push('');
  lines.push('통계를 분석할 때 다음 순서로 접근하세요:');
  lines.push('');
  lines.push('1. **플레이어 관점 먼저**: 적이 강한 것이 아니라 플레이어가 대응할 옵션이 부족한 것일 수 있음');
  lines.push('2. **시너지와 빌드 경로**: 단일 카드보다 카드 조합과 덱 빌딩 경로의 다양성 확인');
  lines.push('3. **진행 곡선**: 특정 구간에서 막히는지, 성장 속도가 적절한지 확인');
  lines.push('4. **너프보다 버프 우선**: 강한 것을 약화시키기보다 약한 대안을 강화하는 것이 게임 경험에 좋음');
  lines.push('5. **샘플 크기 고려**: 최소 20런 이상의 데이터로 결론 도출');
  lines.push('');

  return lines.join('\n');
}

// ==================== 내보내기 ====================

export const StatsAnalyzer = {
  analyzeStats,
  analyzeEnemyBalance,
  analyzeCardBalance,
  analyzeProgressionCurve,
  analyzeSynergies,
  analyzeGrowthPaths,
  generateAnalysisGuidelines,
  THRESHOLDS,
};

export default StatsAnalyzer;
