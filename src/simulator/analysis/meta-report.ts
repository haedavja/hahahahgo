/**
 * @file meta-report.ts
 * @description 메타 리포트 시스템 - 하스스톤/LoR 스타일 메타 분석
 *
 * ## 기능
 * - 덱 아키타입 분류 및 티어 리스트
 * - 매치업 스프레드 분석
 * - 주간/월간 메타 트렌드
 * - 핵심 카드 및 플렉스 슬롯 분석
 */

import type { SimulationResult, BattleResult } from '../core/types';
import type { DeckAnalysisResult } from './deck-analyzer';
import { AsciiCharts, HeatmapGenerator } from './visualizer';

// ==================== 타입 정의 ====================

export interface DeckArchetype {
  id: string;
  name: string;
  coreCards: string[];         // 필수 핵심 카드
  flexCards: string[];         // 변경 가능 슬롯
  avgDeckSize: number;
  description: string;
  playstyle: 'aggro' | 'midrange' | 'control' | 'combo' | 'tempo';
}

export interface TierListEntry {
  archetype: DeckArchetype;
  tier: 'S' | 'A' | 'B' | 'C' | 'D';
  winRate: number;
  playRate: number;
  sampleSize: number;
  trending: 'up' | 'down' | 'stable';
  trendDelta: number;           // 지난 기간 대비 승률 변화
  matchups: MatchupRecord[];
}

export interface MatchupRecord {
  opponentArchetype: string;
  winRate: number;
  sampleSize: number;
  isFavored: boolean;
}

export interface MetaSnapshot {
  id: string;
  date: Date;
  totalGames: number;
  tierList: TierListEntry[];
  topDecks: DeckInstance[];
  metaHealth: MetaHealth;
  highlights: string[];
}

export interface DeckInstance {
  id: string;
  archetypeId: string;
  cards: string[];
  winRate: number;
  gamesPlayed: number;
  creator?: string;
  lastUpdated: Date;
}

export interface MetaHealth {
  diversity: number;            // 0-1, 덱 다양성 지수
  polarization: number;         // 0-1, 매치업 극단성
  dominantArchetype?: string;   // 지배적 아키타입 (있다면)
  staleLevel: 'fresh' | 'developing' | 'settled' | 'stale';
  recommendations: string[];
}

export interface WeeklyTrend {
  week: number;
  startDate: Date;
  endDate: Date;
  topArchetypes: Array<{
    archetypeId: string;
    winRate: number;
    playRate: number;
  }>;
  newDecks: number;
  metaShift: number;            // 0-1, 메타 변화 정도
}

// ==================== 아키타입 분류기 ====================

export class ArchetypeClassifier {
  private knownArchetypes: Map<string, DeckArchetype> = new Map();

  constructor() {
    this.initDefaultArchetypes();
  }

  private initDefaultArchetypes(): void {
    // 기본 아키타입 정의
    const archetypes: DeckArchetype[] = [
      {
        id: 'aggro_rush',
        name: '공격 러시',
        coreCards: ['slash', 'quickStrike', 'combo'],
        flexCards: ['bash', 'heavyBlow'],
        avgDeckSize: 15,
        description: '빠른 피해로 적을 압도하는 공격적 전략',
        playstyle: 'aggro',
      },
      {
        id: 'control_defense',
        name: '방어 컨트롤',
        coreCards: ['defend', 'shieldBash', 'ironWall'],
        flexCards: ['heavyBlow', 'heal'],
        avgDeckSize: 18,
        description: '강력한 방어와 지구전으로 승리',
        playstyle: 'control',
      },
      {
        id: 'combo_burst',
        name: '콤보 버스트',
        coreCards: ['combo', 'quickStrike', 'slash'],
        flexCards: ['preparation', 'powerUp'],
        avgDeckSize: 16,
        description: '카드 콤보로 폭발적 피해',
        playstyle: 'combo',
      },
      {
        id: 'midrange_balanced',
        name: '밸런스 미드레인지',
        coreCards: ['slash', 'defend', 'bash'],
        flexCards: ['combo', 'shieldBash'],
        avgDeckSize: 17,
        description: '공격과 방어의 균형',
        playstyle: 'midrange',
      },
      {
        id: 'tempo_advantage',
        name: '템포 어드밴티지',
        coreCards: ['quickStrike', 'preparation', 'slash'],
        flexCards: ['combo', 'dodge'],
        avgDeckSize: 15,
        description: '행동 순서 장악으로 유리한 거래',
        playstyle: 'tempo',
      },
    ];

    for (const arch of archetypes) {
      this.knownArchetypes.set(arch.id, arch);
    }
  }

  /**
   * 덱을 아키타입으로 분류
   */
  classifyDeck(cards: string[]): { archetypeId: string; confidence: number } | null {
    let bestMatch: { archetypeId: string; confidence: number } | null = null;
    let highestScore = 0;

    for (const [id, archetype] of this.knownArchetypes) {
      const score = this.calculateMatchScore(cards, archetype);
      if (score > highestScore && score >= 0.4) {  // 최소 40% 일치
        highestScore = score;
        bestMatch = { archetypeId: id, confidence: score };
      }
    }

    return bestMatch;
  }

  private calculateMatchScore(cards: string[], archetype: DeckArchetype): number {
    const cardSet = new Set(cards);
    let coreMatches = 0;
    let flexMatches = 0;

    for (const core of archetype.coreCards) {
      if (cardSet.has(core)) coreMatches++;
    }

    for (const flex of archetype.flexCards) {
      if (cardSet.has(flex)) flexMatches++;
    }

    // 핵심 카드 일치가 더 중요 (70% 가중치)
    const coreScore = archetype.coreCards.length > 0
      ? coreMatches / archetype.coreCards.length
      : 0;
    const flexScore = archetype.flexCards.length > 0
      ? flexMatches / archetype.flexCards.length
      : 0;

    return coreScore * 0.7 + flexScore * 0.3;
  }

  /**
   * 새 아키타입 등록
   */
  registerArchetype(archetype: DeckArchetype): void {
    this.knownArchetypes.set(archetype.id, archetype);
  }

  getArchetype(id: string): DeckArchetype | undefined {
    return this.knownArchetypes.get(id);
  }

  getAllArchetypes(): DeckArchetype[] {
    return Array.from(this.knownArchetypes.values());
  }
}

// ==================== 메타 분석기 ====================

export class MetaAnalyzer {
  private classifier: ArchetypeClassifier;
  private snapshots: MetaSnapshot[] = [];
  private deckHistory: Map<string, DeckInstance[]> = new Map();

  constructor(classifier?: ArchetypeClassifier) {
    this.classifier = classifier || new ArchetypeClassifier();
  }

  /**
   * 시뮬레이션 결과로부터 메타 스냅샷 생성
   */
  generateSnapshot(
    results: SimulationResult[],
    deckInfos: Array<{ id: string; cards: string[] }>
  ): MetaSnapshot {
    // 덱별 승률 계산
    const deckStats = this.calculateDeckStats(results, deckInfos);

    // 아키타입별 집계
    const archetypeStats = this.aggregateByArchetype(deckStats);

    // 티어 리스트 생성
    const tierList = this.generateTierList(archetypeStats);

    // 매치업 분석
    this.calculateMatchups(tierList, results, deckInfos);

    // 메타 건강도 분석
    const metaHealth = this.analyzeMetaHealth(tierList);

    // 하이라이트 생성
    const highlights = this.generateHighlights(tierList, metaHealth);

    // 상위 덱 추출
    const topDecks = this.extractTopDecks(deckStats, 10);

    const snapshot: MetaSnapshot = {
      id: `snapshot-${Date.now()}`,
      date: new Date(),
      totalGames: results.reduce((sum, r) => sum + r.summary.totalBattles, 0),
      tierList,
      topDecks,
      metaHealth,
      highlights,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  private calculateDeckStats(
    results: SimulationResult[],
    deckInfos: Array<{ id: string; cards: string[] }>
  ): Map<string, { winRate: number; games: number; cards: string[] }> {
    const stats = new Map<string, { wins: number; games: number; cards: string[] }>();

    for (let i = 0; i < deckInfos.length && i < results.length; i++) {
      const deck = deckInfos[i];
      const result = results[i];

      const existing = stats.get(deck.id) || { wins: 0, games: 0, cards: deck.cards };
      existing.wins += result.summary.wins;
      existing.games += result.summary.totalBattles;
      stats.set(deck.id, existing);
    }

    const finalStats = new Map<string, { winRate: number; games: number; cards: string[] }>();
    for (const [id, data] of stats) {
      finalStats.set(id, {
        winRate: data.games > 0 ? data.wins / data.games : 0,
        games: data.games,
        cards: data.cards,
      });
    }

    return finalStats;
  }

  private aggregateByArchetype(
    deckStats: Map<string, { winRate: number; games: number; cards: string[] }>
  ): Map<string, { totalWins: number; totalGames: number; decks: string[] }> {
    const archetypeStats = new Map<string, { totalWins: number; totalGames: number; decks: string[] }>();

    for (const [deckId, stats] of deckStats) {
      const classification = this.classifier.classifyDeck(stats.cards);
      if (!classification) continue;

      const archId = classification.archetypeId;
      const existing = archetypeStats.get(archId) || { totalWins: 0, totalGames: 0, decks: [] };
      existing.totalWins += stats.winRate * stats.games;
      existing.totalGames += stats.games;
      existing.decks.push(deckId);
      archetypeStats.set(archId, existing);
    }

    return archetypeStats;
  }

  private generateTierList(
    archetypeStats: Map<string, { totalWins: number; totalGames: number; decks: string[] }>
  ): TierListEntry[] {
    const entries: TierListEntry[] = [];
    const totalGames = Array.from(archetypeStats.values()).reduce((sum, s) => sum + s.totalGames, 0);

    for (const [archId, stats] of archetypeStats) {
      const archetype = this.classifier.getArchetype(archId);
      if (!archetype) continue;

      const winRate = stats.totalGames > 0 ? stats.totalWins / stats.totalGames : 0;
      const playRate = totalGames > 0 ? stats.totalGames / totalGames : 0;

      // 이전 스냅샷과 비교해 트렌드 계산
      const prevSnapshot = this.snapshots[this.snapshots.length - 1];
      let trending: 'up' | 'down' | 'stable' = 'stable';
      let trendDelta = 0;

      if (prevSnapshot) {
        const prevEntry = prevSnapshot.tierList.find(e => e.archetype.id === archId);
        if (prevEntry) {
          trendDelta = winRate - prevEntry.winRate;
          if (trendDelta > 0.02) trending = 'up';
          else if (trendDelta < -0.02) trending = 'down';
        }
      }

      entries.push({
        archetype,
        tier: this.calculateTier(winRate, playRate, stats.totalGames),
        winRate,
        playRate,
        sampleSize: stats.totalGames,
        trending,
        trendDelta,
        matchups: [],
      });
    }

    // 티어 및 승률 순 정렬
    const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    return entries.sort((a, b) => {
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      return b.winRate - a.winRate;
    });
  }

  private calculateTier(
    winRate: number,
    playRate: number,
    sampleSize: number
  ): 'S' | 'A' | 'B' | 'C' | 'D' {
    // 샘플 크기가 너무 작으면 신뢰도 하락
    const confidenceFactor = Math.min(1, sampleSize / 100);
    const adjustedWinRate = 0.5 + (winRate - 0.5) * confidenceFactor;

    if (adjustedWinRate >= 0.55 && playRate >= 0.1) return 'S';
    if (adjustedWinRate >= 0.52) return 'A';
    if (adjustedWinRate >= 0.48) return 'B';
    if (adjustedWinRate >= 0.45) return 'C';
    return 'D';
  }

  private calculateMatchups(
    tierList: TierListEntry[],
    results: SimulationResult[],
    deckInfos: Array<{ id: string; cards: string[] }>
  ): void {
    // 덱 -> 아키타입 매핑
    const deckToArchetype = new Map<string, string>();
    for (const deck of deckInfos) {
      const classification = this.classifier.classifyDeck(deck.cards);
      if (classification) {
        deckToArchetype.set(deck.id, classification.archetypeId);
      }
    }

    // 아키타입 쌍별 승률 집계
    const matchupStats = new Map<string, { wins: number; games: number }>();

    for (const entry of tierList) {
      const archId = entry.archetype.id;
      entry.matchups = [];

      for (const opponent of tierList) {
        if (opponent.archetype.id === archId) continue;

        const key = `${archId}_vs_${opponent.archetype.id}`;
        const stats = matchupStats.get(key) || { wins: 0, games: 0 };

        // 실제 매치업 데이터가 없으면 추정치 사용
        const estimatedWinRate = this.estimateMatchupWinRate(entry, opponent);

        entry.matchups.push({
          opponentArchetype: opponent.archetype.id,
          winRate: estimatedWinRate,
          sampleSize: stats.games || 10,  // 최소 추정치
          isFavored: estimatedWinRate >= 0.52,
        });
      }
    }
  }

  private estimateMatchupWinRate(
    deck: TierListEntry,
    opponent: TierListEntry
  ): number {
    // 간단한 매치업 추정 (플레이스타일 기반)
    const styleAdvantage: Record<string, Record<string, number>> = {
      aggro: { control: -0.05, midrange: 0.02, combo: 0.05, tempo: 0 },
      control: { aggro: 0.05, midrange: 0, combo: -0.03, tempo: -0.02 },
      midrange: { aggro: -0.02, control: 0, combo: 0.02, tempo: 0.01 },
      combo: { aggro: -0.05, control: 0.03, midrange: -0.02, tempo: -0.01 },
      tempo: { aggro: 0, control: 0.02, midrange: -0.01, combo: 0.01 },
    };

    const deckStyle = deck.archetype.playstyle;
    const opponentStyle = opponent.archetype.playstyle;

    const baseAdvantage = styleAdvantage[deckStyle]?.[opponentStyle] || 0;

    // 기본 승률에 매치업 보정
    return Math.max(0.3, Math.min(0.7, deck.winRate + baseAdvantage));
  }

  private analyzeMetaHealth(tierList: TierListEntry[]): MetaHealth {
    const recommendations: string[] = [];

    // 다양성 계산 (심슨 다양성 지수)
    const totalPlayRate = tierList.reduce((sum, e) => sum + e.playRate, 0);
    let diversitySum = 0;
    for (const entry of tierList) {
      const p = entry.playRate / (totalPlayRate || 1);
      diversitySum += p * p;
    }
    const diversity = 1 - diversitySum;

    // 극단화 계산 (매치업 편향)
    let polarizationSum = 0;
    let matchupCount = 0;
    for (const entry of tierList) {
      for (const matchup of entry.matchups) {
        polarizationSum += Math.abs(matchup.winRate - 0.5);
        matchupCount++;
      }
    }
    const polarization = matchupCount > 0 ? polarizationSum / matchupCount * 2 : 0;

    // 지배적 아키타입 확인
    const dominant = tierList.find(e => e.playRate > 0.25 && e.winRate > 0.54);
    const dominantArchetype = dominant?.archetype.id;

    // 메타 상태 판단
    let staleLevel: MetaHealth['staleLevel'] = 'fresh';
    if (this.snapshots.length >= 4) {
      const recentShifts = this.snapshots.slice(-4).map((s, i, arr) => {
        if (i === 0) return 0;
        return this.calculateMetaShift(arr[i - 1], s);
      });
      const avgShift = recentShifts.slice(1).reduce((a, b) => a + b, 0) / 3;

      if (avgShift < 0.02) staleLevel = 'stale';
      else if (avgShift < 0.05) staleLevel = 'settled';
      else if (avgShift < 0.1) staleLevel = 'developing';
    }

    // 권장사항 생성
    if (dominantArchetype) {
      const arch = this.classifier.getArchetype(dominantArchetype);
      recommendations.push(`🔴 ${arch?.name || dominantArchetype}가 메타를 지배 중 - 카운터 덱 추천`);
    }

    if (diversity < 0.5) {
      recommendations.push('⚠️ 메타 다양성 낮음 - 새로운 아키타입 개발 필요');
    }

    if (polarization > 0.15) {
      recommendations.push('⚠️ 가위바위보 메타 - 매치업 극단화 주의');
    }

    if (staleLevel === 'stale') {
      recommendations.push('💤 메타가 정체됨 - 밸런스 패치 또는 새 카드 필요');
    }

    const sTierCount = tierList.filter(e => e.tier === 'S').length;
    if (sTierCount >= 3) {
      recommendations.push('✅ 건강한 메타 - 다양한 S티어 덱 존재');
    }

    return {
      diversity,
      polarization,
      dominantArchetype,
      staleLevel,
      recommendations,
    };
  }

  private calculateMetaShift(prev: MetaSnapshot, current: MetaSnapshot): number {
    let totalShift = 0;

    for (const currentEntry of current.tierList) {
      const prevEntry = prev.tierList.find(e => e.archetype.id === currentEntry.archetype.id);
      if (prevEntry) {
        totalShift += Math.abs(currentEntry.winRate - prevEntry.winRate);
        totalShift += Math.abs(currentEntry.playRate - prevEntry.playRate);
      } else {
        totalShift += 0.1;  // 새 아키타입
      }
    }

    return totalShift / Math.max(1, current.tierList.length);
  }

  private generateHighlights(
    tierList: TierListEntry[],
    health: MetaHealth
  ): string[] {
    const highlights: string[] = [];

    // 가장 강한 덱
    if (tierList.length > 0) {
      const best = tierList[0];
      highlights.push(`🏆 최강 덱: ${best.archetype.name} (승률 ${(best.winRate * 100).toFixed(1)}%)`);
    }

    // 상승 중인 덱
    const rising = tierList.filter(e => e.trending === 'up').sort((a, b) => b.trendDelta - a.trendDelta);
    if (rising.length > 0) {
      highlights.push(`📈 급상승: ${rising[0].archetype.name} (+${(rising[0].trendDelta * 100).toFixed(1)}%)`);
    }

    // 하락 중인 덱
    const falling = tierList.filter(e => e.trending === 'down').sort((a, b) => a.trendDelta - b.trendDelta);
    if (falling.length > 0) {
      highlights.push(`📉 급하락: ${falling[0].archetype.name} (${(falling[0].trendDelta * 100).toFixed(1)}%)`);
    }

    // 메타 건강도
    if (health.diversity >= 0.7) {
      highlights.push('🌈 메타 다양성: 매우 좋음');
    } else if (health.diversity >= 0.5) {
      highlights.push('📊 메타 다양성: 보통');
    } else {
      highlights.push('⚠️ 메타 다양성: 주의 필요');
    }

    return highlights;
  }

  private extractTopDecks(
    deckStats: Map<string, { winRate: number; games: number; cards: string[] }>,
    limit: number
  ): DeckInstance[] {
    const decks: DeckInstance[] = [];

    for (const [id, stats] of deckStats) {
      if (stats.games < 10) continue;  // 최소 게임 수

      const classification = this.classifier.classifyDeck(stats.cards);

      decks.push({
        id,
        archetypeId: classification?.archetypeId || 'unknown',
        cards: stats.cards,
        winRate: stats.winRate,
        gamesPlayed: stats.games,
        lastUpdated: new Date(),
      });
    }

    return decks
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }

  /**
   * 주간 트렌드 분석
   */
  getWeeklyTrends(weeks: number = 4): WeeklyTrend[] {
    const trends: WeeklyTrend[] = [];

    for (let w = 0; w < weeks && w < this.snapshots.length; w++) {
      const snapshot = this.snapshots[this.snapshots.length - 1 - w];
      if (!snapshot) continue;

      const weekStart = new Date(snapshot.date);
      weekStart.setDate(weekStart.getDate() - 7);

      trends.push({
        week: weeks - w,
        startDate: weekStart,
        endDate: snapshot.date,
        topArchetypes: snapshot.tierList.slice(0, 5).map(e => ({
          archetypeId: e.archetype.id,
          winRate: e.winRate,
          playRate: e.playRate,
        })),
        newDecks: snapshot.topDecks.filter(d =>
          d.lastUpdated > weekStart
        ).length,
        metaShift: w > 0 && this.snapshots.length > w + 1
          ? this.calculateMetaShift(this.snapshots[this.snapshots.length - 2 - w], snapshot)
          : 0,
      });
    }

    return trends.reverse();
  }

  /**
   * 마크다운 리포트 생성
   */
  generateMarkdownReport(snapshot: MetaSnapshot): string {
    const lines: string[] = [];

    lines.push('# 📊 메타 리포트');
    lines.push(`생성일: ${snapshot.date.toISOString().split('T')[0]}`);
    lines.push(`총 게임 수: ${snapshot.totalGames.toLocaleString()}`);
    lines.push('');

    // 하이라이트
    lines.push('## 🔥 이번 주 하이라이트');
    for (const highlight of snapshot.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push('');

    // 티어 리스트
    lines.push('## 🏆 티어 리스트');
    lines.push('| 티어 | 아키타입 | 승률 | 사용률 | 트렌드 |');
    lines.push('|:----:|:---------|-----:|-------:|:------:|');

    for (const entry of snapshot.tierList) {
      const trendIcon = entry.trending === 'up' ? '↑' : entry.trending === 'down' ? '↓' : '→';
      lines.push(
        `| ${entry.tier} | ${entry.archetype.name} | ${(entry.winRate * 100).toFixed(1)}% | ${(entry.playRate * 100).toFixed(1)}% | ${trendIcon} |`
      );
    }
    lines.push('');

    // 매치업 스프레드 (상위 티어만)
    const topTiers = snapshot.tierList.filter(e => e.tier === 'S' || e.tier === 'A');
    if (topTiers.length > 1) {
      lines.push('## ⚔️ 매치업 스프레드 (상위 티어)');
      lines.push('');

      const header = '| vs |' + topTiers.map(e => ` ${e.archetype.name.slice(0, 6)} |`).join('');
      lines.push(header);
      lines.push('|:---|' + topTiers.map(() => ':-----:|').join(''));

      for (const entry of topTiers) {
        let row = `| ${entry.archetype.name.slice(0, 6)} |`;
        for (const opponent of topTiers) {
          if (entry.archetype.id === opponent.archetype.id) {
            row += ' - |';
          } else {
            const matchup = entry.matchups.find(m => m.opponentArchetype === opponent.archetype.id);
            if (matchup) {
              const wr = (matchup.winRate * 100).toFixed(0);
              const color = matchup.isFavored ? '**' : '';
              row += ` ${color}${wr}%${color} |`;
            } else {
              row += ' ? |';
            }
          }
        }
        lines.push(row);
      }
      lines.push('');
    }

    // 메타 건강도
    lines.push('## 💊 메타 건강도');
    lines.push(`- 다양성 지수: ${(snapshot.metaHealth.diversity * 100).toFixed(0)}%`);
    lines.push(`- 극단화 지수: ${(snapshot.metaHealth.polarization * 100).toFixed(0)}%`);
    lines.push(`- 메타 상태: ${snapshot.metaHealth.staleLevel}`);
    lines.push('');

    if (snapshot.metaHealth.recommendations.length > 0) {
      lines.push('### 권장사항');
      for (const rec of snapshot.metaHealth.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * ASCII 티어 리스트 출력
   */
  printTierList(snapshot: MetaSnapshot): string {
    const charts = new AsciiCharts({ width: 50 });
    const lines: string[] = [];

    lines.push('\n' + '═'.repeat(60));
    lines.push('📊 메타 티어 리스트');
    lines.push('═'.repeat(60));

    const tierGroups: Record<string, TierListEntry[]> = { S: [], A: [], B: [], C: [], D: [] };
    for (const entry of snapshot.tierList) {
      tierGroups[entry.tier].push(entry);
    }

    for (const tier of ['S', 'A', 'B', 'C', 'D'] as const) {
      if (tierGroups[tier].length === 0) continue;

      const tierIcon = tier === 'S' ? '🏆' : tier === 'A' ? '⭐' : tier === 'B' ? '✓' : tier === 'C' ? '○' : '△';
      lines.push(`\n${tierIcon} [${tier} 티어]`);
      lines.push('─'.repeat(50));

      for (const entry of tierGroups[tier]) {
        const trendIcon = entry.trending === 'up' ? '↑' : entry.trending === 'down' ? '↓' : ' ';
        const winRateBar = '█'.repeat(Math.round(entry.winRate * 20));
        lines.push(
          `  ${entry.archetype.name.padEnd(15)} ${winRateBar} ${(entry.winRate * 100).toFixed(1)}% ${trendIcon}`
        );
      }
    }

    lines.push('\n' + '═'.repeat(60));

    return lines.join('\n');
  }
}

// ==================== 팩토리 함수 ====================

export function createMetaAnalyzer(): MetaAnalyzer {
  return new MetaAnalyzer();
}

export function createArchetypeClassifier(): ArchetypeClassifier {
  return new ArchetypeClassifier();
}
