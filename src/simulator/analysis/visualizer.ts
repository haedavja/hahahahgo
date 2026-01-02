/**
 * @file visualizer.ts
 * @description 시각화 시스템 - 히트맵, 차트, 그래프 생성
 */

import type { SimulationResult, BattleResult } from '../core/types';
import type { SynergyMatrix, SynergyPair } from './synergy';
import type { DeckAnalysisResult } from './deck-analyzer';
import type { ReplayStatistics } from './replay-enhanced';

// ==================== 타입 ====================

export interface ChartConfig {
  width: number;
  height: number;
  title?: string;
  xLabel?: string;
  yLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
}

export interface HeatmapConfig extends ChartConfig {
  minColor?: string;
  maxColor?: string;
  showValues?: boolean;
}

export interface Point {
  x: number;
  y: number;
  label?: string;
  value?: number;
}

export interface Series {
  name: string;
  data: number[];
  color?: string;
}

// ==================== ASCII 차트 ====================

export class AsciiCharts {
  private config: ChartConfig;

  constructor(config: Partial<ChartConfig> = {}) {
    this.config = {
      width: config.width ?? 60,
      height: config.height ?? 15,
      showGrid: config.showGrid ?? true,
      showLegend: config.showLegend ?? true,
      colors: config.colors ?? ['█', '▓', '▒', '░'],
      ...config,
    };
  }

  /**
   * 막대 그래프
   */
  barChart(data: { label: string; value: number }[], title?: string): string {
    const lines: string[] = [];
    const maxValue = Math.max(...data.map(d => d.value));
    const maxLabel = Math.max(...data.map(d => d.label.length));
    const barWidth = this.config.width - maxLabel - 10;

    if (title) {
      lines.push(`\n${title}`);
      lines.push('─'.repeat(this.config.width));
    }

    for (const item of data) {
      const barLength = Math.round((item.value / maxValue) * barWidth);
      const bar = '█'.repeat(barLength);
      const label = item.label.padEnd(maxLabel);
      const valueStr = item.value.toFixed(1).padStart(6);
      lines.push(`${label} │${bar} ${valueStr}`);
    }

    return lines.join('\n');
  }

  /**
   * 수평 히스토그램
   */
  histogram(data: number[], bins: number = 10, title?: string): string {
    const lines: string[] = [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;

    // 빈 카운트
    const binCounts = new Array(bins).fill(0);
    for (const value of data) {
      const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
      binCounts[binIndex]++;
    }

    const maxCount = Math.max(...binCounts);

    if (title) {
      lines.push(`\n${title}`);
      lines.push('─'.repeat(this.config.width));
    }

    for (let i = 0; i < bins; i++) {
      const binStart = (min + i * binSize).toFixed(1);
      const binEnd = (min + (i + 1) * binSize).toFixed(1);
      const barLength = Math.round((binCounts[i] / maxCount) * (this.config.width - 20));
      const bar = '█'.repeat(barLength);
      lines.push(`${binStart.padStart(6)}-${binEnd.padEnd(6)} │${bar} ${binCounts[i]}`);
    }

    return lines.join('\n');
  }

  /**
   * 라인 차트 (ASCII)
   */
  lineChart(series: Series[], title?: string): string {
    const lines: string[] = [];
    const height = this.config.height;
    const width = this.config.width;

    // 모든 데이터의 범위 계산
    const allValues = series.flatMap(s => s.data);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const range = maxValue - minValue || 1;

    if (title) {
      lines.push(`\n${title}`);
      lines.push('─'.repeat(width));
    }

    // 그래프 영역 초기화
    const graph: string[][] = Array(height).fill(null).map(() => Array(width - 8).fill(' '));

    // 각 시리즈 그리기
    const symbols = ['●', '○', '◆', '◇', '■', '□'];
    for (let sIdx = 0; sIdx < series.length; sIdx++) {
      const s = series[sIdx];
      const symbol = symbols[sIdx % symbols.length];

      for (let i = 0; i < s.data.length; i++) {
        const x = Math.floor((i / (s.data.length - 1)) * (width - 10));
        const y = Math.floor(((s.data[i] - minValue) / range) * (height - 1));
        const row = height - 1 - y;
        if (row >= 0 && row < height && x >= 0 && x < width - 8) {
          graph[row][x] = symbol;
        }
      }
    }

    // Y축 레이블과 함께 출력
    for (let row = 0; row < height; row++) {
      const yValue = maxValue - (row / (height - 1)) * range;
      const yLabel = yValue.toFixed(1).padStart(6);
      lines.push(`${yLabel} │${graph[row].join('')}`);
    }

    // X축
    lines.push(`${''.padStart(6)} └${'─'.repeat(width - 8)}`);

    // 범례
    if (this.config.showLegend && series.length > 1) {
      lines.push('');
      const legend = series.map((s, i) => `${symbols[i]} ${s.name}`).join('  ');
      lines.push(`범례: ${legend}`);
    }

    return lines.join('\n');
  }

  /**
   * 파이 차트 (ASCII)
   */
  pieChart(data: { label: string; value: number }[], title?: string): string {
    const lines: string[] = [];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const symbols = ['█', '▓', '▒', '░', '▪', '▫'];

    if (title) {
      lines.push(`\n${title}`);
      lines.push('─'.repeat(this.config.width));
    }

    // 막대 표시
    let barLine = '';
    for (let i = 0; i < data.length; i++) {
      const percent = data[i].value / total;
      const chars = Math.round(percent * 40);
      barLine += symbols[i % symbols.length].repeat(chars);
    }
    lines.push(`[${barLine}]`);
    lines.push('');

    // 범례
    for (let i = 0; i < data.length; i++) {
      const percent = ((data[i].value / total) * 100).toFixed(1);
      lines.push(`${symbols[i % symbols.length]} ${data[i].label}: ${data[i].value} (${percent}%)`);
    }

    return lines.join('\n');
  }

  /**
   * 스파크라인
   */
  sparkline(data: number[]): string {
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data.map(v => {
      const index = Math.round(((v - min) / range) * (chars.length - 1));
      return chars[index];
    }).join('');
  }
}

// ==================== 히트맵 ====================

export class HeatmapGenerator {
  private config: HeatmapConfig;

  constructor(config: Partial<HeatmapConfig> = {}) {
    this.config = {
      width: config.width ?? 60,
      height: config.height ?? 20,
      minColor: config.minColor ?? '\x1b[34m',  // Blue
      maxColor: config.maxColor ?? '\x1b[31m',  // Red
      showValues: config.showValues ?? false,
      ...config,
    };
  }

  /**
   * 시너지 매트릭스 히트맵
   */
  synergyHeatmap(matrix: SynergyMatrix): string {
    const lines: string[] = [];
    const { cards, matrix: data } = matrix;
    const n = cards.length;

    // 셀 문자
    const cells = ['  ', '░░', '▒▒', '▓▓', '██'];
    const negCells = ['  ', '··', '::'];

    // 범위 계산
    const flatData = data.flat();
    const maxAbs = Math.max(...flatData.map(Math.abs));

    lines.push('\n📊 시너지 히트맵');
    lines.push('─'.repeat(n * 3 + 15));

    // 헤더
    const header = ''.padEnd(10) + cards.map(c => c.slice(0, 2).padEnd(3)).join('');
    lines.push(header);

    // 행
    for (let i = 0; i < n; i++) {
      let row = cards[i].slice(0, 8).padEnd(10);
      for (let j = 0; j < n; j++) {
        const value = data[i][j];
        if (i === j) {
          row += ' - ';
        } else if (value >= 0) {
          const cellIndex = Math.min(Math.floor((value / maxAbs) * cells.length), cells.length - 1);
          row += cells[cellIndex] + ' ';
        } else {
          const cellIndex = Math.min(Math.floor((Math.abs(value) / maxAbs) * negCells.length), negCells.length - 1);
          row += negCells[cellIndex] + ' ';
        }
      }
      lines.push(row);
    }

    // 범례
    lines.push('');
    lines.push('범례: ██ 높은 시너지  ▓▓ 중간  ░░ 낮음  :: 안티시너지');

    return lines.join('\n');
  }

  /**
   * 카드 성능 히트맵
   */
  cardPerformanceHeatmap(
    cardStats: { cardId: string; winRate: number; avgDamage: number; usage: number }[]
  ): string {
    const lines: string[] = [];

    lines.push('\n📊 카드 성능 히트맵');
    lines.push('─'.repeat(60));
    lines.push('카드'.padEnd(15) + '승률'.padEnd(12) + '피해량'.padEnd(12) + '사용률');

    const maxWinRate = Math.max(...cardStats.map(c => c.winRate));
    const maxDamage = Math.max(...cardStats.map(c => c.avgDamage));
    const maxUsage = Math.max(...cardStats.map(c => c.usage));

    for (const card of cardStats) {
      const winRateBar = this.colorBar(card.winRate / maxWinRate, 8);
      const damageBar = this.colorBar(card.avgDamage / maxDamage, 8);
      const usageBar = this.colorBar(card.usage / maxUsage, 8);

      lines.push(
        card.cardId.slice(0, 14).padEnd(15) +
        winRateBar + '   ' +
        damageBar + '   ' +
        usageBar
      );
    }

    return lines.join('\n');
  }

  private colorBar(ratio: number, width: number): string {
    const filled = Math.round(ratio * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  }

  /**
   * 턴별 HP 히트맵
   */
  turnHpHeatmap(battles: BattleResult[], maxTurns: number = 20): string {
    const lines: string[] = [];

    lines.push('\n📊 턴별 HP 분포');
    lines.push('─'.repeat(maxTurns * 2 + 10));

    // 턴별 평균 HP 계산 (추정)
    const turnData: number[] = Array(maxTurns).fill(0);
    let counts: number[] = Array(maxTurns).fill(0);

    for (const battle of battles) {
      const finalTurn = Math.min(battle.turns, maxTurns);
      for (let t = 0; t < finalTurn; t++) {
        // 선형 보간으로 HP 추정
        const hpRatio = 1 - (t / finalTurn) * (1 - battle.playerFinalHp / 100);
        turnData[t] += hpRatio * 100;
        counts[t]++;
      }
    }

    // 평균 계산
    for (let t = 0; t < maxTurns; t++) {
      if (counts[t] > 0) turnData[t] /= counts[t];
    }

    // 시각화
    const bars = '▁▂▃▄▅▆▇█';
    let hpLine = 'HP:  ';
    for (let t = 0; t < maxTurns; t++) {
      const ratio = turnData[t] / 100;
      const barIndex = Math.floor(ratio * (bars.length - 1));
      hpLine += bars[barIndex] + ' ';
    }
    lines.push(hpLine);

    // 턴 번호
    let turnLine = '턴:  ';
    for (let t = 1; t <= maxTurns; t++) {
      turnLine += (t % 10).toString() + ' ';
    }
    lines.push(turnLine);

    return lines.join('\n');
  }
}

// ==================== 네트워크 그래프 ====================

export class NetworkGraph {
  /**
   * 시너지 네트워크 ASCII 표현
   */
  static drawSynergyNetwork(pairs: SynergyPair[], topN: number = 10): string {
    const lines: string[] = [];
    const topPairs = pairs.slice(0, topN);

    lines.push('\n🕸️ 시너지 네트워크');
    lines.push('─'.repeat(50));

    // 노드 수집
    const nodes = new Set<string>();
    for (const pair of topPairs) {
      nodes.add(pair.card1);
      nodes.add(pair.card2);
    }

    // 연결 표시
    for (const pair of topPairs) {
      const strength = pair.synergyScore > 0.05 ? '══' :
                       pair.synergyScore > 0.02 ? '──' : '··';
      const boost = pair.winRateBoost > 0 ? `+${pair.winRateBoost.toFixed(1)}%` : `${pair.winRateBoost.toFixed(1)}%`;
      lines.push(`  ${pair.card1.padEnd(12)} ${strength} ${pair.card2.padEnd(12)} (${boost})`);
    }

    // 허브 노드 (가장 많은 연결)
    const nodeCounts: Record<string, number> = {};
    for (const pair of topPairs) {
      nodeCounts[pair.card1] = (nodeCounts[pair.card1] || 0) + 1;
      nodeCounts[pair.card2] = (nodeCounts[pair.card2] || 0) + 1;
    }

    const hubs = Object.entries(nodeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (hubs.length > 0) {
      lines.push('');
      lines.push('🎯 핵심 허브 카드:');
      for (const [card, count] of hubs) {
        lines.push(`  • ${card}: ${count}개 연결`);
      }
    }

    return lines.join('\n');
  }
}

// ==================== 리포트 생성기 ====================

export class ReportGenerator {
  private charts: AsciiCharts;
  private heatmap: HeatmapGenerator;

  constructor() {
    this.charts = new AsciiCharts();
    this.heatmap = new HeatmapGenerator();
  }

  /**
   * 시뮬레이션 결과 리포트
   */
  simulationReport(result: SimulationResult): string {
    const lines: string[] = [];
    const { summary, results } = result;

    lines.push('\n' + '═'.repeat(60));
    lines.push('📊 시뮬레이션 결과 리포트');
    lines.push('═'.repeat(60));

    // 기본 통계
    lines.push(`\n📈 기본 통계`);
    lines.push(`  총 전투: ${summary.totalBattles}`);
    lines.push(`  승리: ${summary.wins} (${(summary.winRate * 100).toFixed(1)}%)`);
    lines.push(`  패배: ${summary.losses}`);
    lines.push(`  평균 턴: ${summary.avgTurns.toFixed(1)}`);

    // 승률 파이차트
    lines.push(this.charts.pieChart([
      { label: '승리', value: summary.wins },
      { label: '패배', value: summary.losses },
      { label: '무승부', value: summary.draws || 0 },
    ], '전투 결과 분포'));

    // 턴 분포
    const turnCounts = results.map(r => r.turns);
    lines.push(this.charts.histogram(turnCounts, 8, '턴 수 분포'));

    // 피해량 분포
    const damageCounts = results.map(r => r.playerDamageDealt);
    lines.push(this.charts.histogram(damageCounts, 8, '플레이어 피해량 분포'));

    // HP 스파크라인
    const hpSpark = results.map(r => r.playerFinalHp);
    lines.push(`\n최종 HP 추이: ${this.charts.sparkline(hpSpark)}`);

    lines.push('\n' + '═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * 덱 분석 리포트 시각화
   */
  deckAnalysisReport(analysis: DeckAnalysisResult): string {
    const lines: string[] = [];

    lines.push('\n' + '═'.repeat(60));
    lines.push('🎴 덱 분석 시각화 리포트');
    lines.push('═'.repeat(60));

    // 마나 곡선 시각화
    lines.push(this.charts.barChart(
      analysis.curve.distribution.map(d => ({
        label: `${d.cost}코스트`,
        value: d.count,
      })),
      '마나 곡선'
    ));

    // 타입 분포 파이차트
    const typeData = Object.entries(analysis.stats.typeDistribution)
      .map(([type, count]) => ({ label: type, value: count }));
    lines.push(this.charts.pieChart(typeData, '카드 타입 분포'));

    // 점수 레이더 차트 (텍스트)
    lines.push('\n📊 덱 점수');
    lines.push('─'.repeat(40));
    const scores = [
      { label: '파워', value: analysis.score.power },
      { label: '일관성', value: analysis.score.consistency },
      { label: '유연성', value: analysis.score.flexibility },
      { label: '시너지', value: analysis.score.synergy },
      { label: '효율', value: analysis.score.efficiency },
    ];
    lines.push(this.charts.barChart(scores, ''));

    // 종합 점수
    lines.push(`\n🎯 종합 점수: ${analysis.score.overall.toFixed(0)}/100`);

    lines.push('\n' + '═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * 밸런스 비교 리포트
   */
  balanceComparisonReport(
    before: SimulationResult,
    after: SimulationResult,
    changeDescription: string
  ): string {
    const lines: string[] = [];

    lines.push('\n' + '═'.repeat(60));
    lines.push('⚖️ 밸런스 변경 비교');
    lines.push('═'.repeat(60));
    lines.push(`변경: ${changeDescription}`);
    lines.push('');

    // 비교 데이터
    const comparison = [
      {
        label: '승률',
        before: before.summary.winRate * 100,
        after: after.summary.winRate * 100,
      },
      {
        label: '평균 턴',
        before: before.summary.avgTurns,
        after: after.summary.avgTurns,
      },
      {
        label: '평균 피해',
        before: before.summary.avgPlayerDamage,
        after: after.summary.avgPlayerDamage,
      },
    ];

    lines.push('지표'.padEnd(15) + '변경 전'.padEnd(12) + '변경 후'.padEnd(12) + '차이');
    lines.push('─'.repeat(50));

    for (const c of comparison) {
      const diff = c.after - c.before;
      const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      lines.push(
        c.label.padEnd(15) +
        c.before.toFixed(1).padEnd(12) +
        c.after.toFixed(1).padEnd(12) +
        `${arrow} ${diffStr}`
      );
    }

    // 트렌드 라인
    const beforeWins = before.results.slice(0, 50).filter(r => r.winner === 'player').length;
    const afterWins = after.results.slice(0, 50).filter(r => r.winner === 'player').length;

    lines.push('');
    lines.push('50전 승률 추이:');
    lines.push(`  변경 전: ${this.charts.sparkline(
      before.results.slice(0, 50).map((r, i) =>
        before.results.slice(0, i + 1).filter(x => x.winner === 'player').length / (i + 1) * 100
      )
    )}`);
    lines.push(`  변경 후: ${this.charts.sparkline(
      after.results.slice(0, 50).map((r, i) =>
        after.results.slice(0, i + 1).filter(x => x.winner === 'player').length / (i + 1) * 100
      )
    )}`);

    lines.push('\n' + '═'.repeat(60));

    return lines.join('\n');
  }
}

// ==================== HTML 시각화 ====================

export class HtmlVisualizer {
  /**
   * Chart.js 기반 HTML 페이지 생성
   */
  static generateDashboard(
    results: SimulationResult[],
    title: string = '시뮬레이션 대시보드'
  ): string {
    const chartData = results.map((r, i) => ({
      label: `Run ${i + 1}`,
      winRate: r.summary.winRate * 100,
      avgTurns: r.summary.avgTurns,
      avgDamage: r.summary.avgPlayerDamage,
    }));

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .chart-container { background: #16213e; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    h1 { color: #e94560; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    canvas { max-height: 300px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 ${title}</h1>
    <div class="grid">
      <div class="chart-container">
        <canvas id="winRateChart"></canvas>
      </div>
      <div class="chart-container">
        <canvas id="turnsChart"></canvas>
      </div>
    </div>
  </div>
  <script>
    const data = ${JSON.stringify(chartData)};

    new Chart(document.getElementById('winRateChart'), {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: '승률 (%)',
          data: data.map(d => d.winRate),
          backgroundColor: '#e94560'
        }]
      },
      options: { plugins: { title: { display: true, text: '승률 비교' } } }
    });

    new Chart(document.getElementById('turnsChart'), {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: '평균 턴',
          data: data.map(d => d.avgTurns),
          borderColor: '#4ade80',
          tension: 0.1
        }]
      },
      options: { plugins: { title: { display: true, text: '평균 턴 추이' } } }
    });
  </script>
</body>
</html>`;
  }

  /**
   * 시너지 히트맵 HTML
   */
  static generateSynergyHeatmapHtml(matrix: SynergyMatrix): string {
    const { cards, matrix: data } = matrix;
    const n = cards.length;

    const cellsHtml = data.map((row, i) =>
      row.map((val, j) => {
        if (i === j) return '<td style="background:#333">-</td>';
        const intensity = Math.min(Math.abs(val) * 10, 1);
        const color = val >= 0
          ? `rgba(74, 222, 128, ${intensity})`
          : `rgba(233, 69, 96, ${intensity})`;
        return `<td style="background:${color}">${val.toFixed(2)}</td>`;
      }).join('')
    ).map((row, i) => `<tr><th>${cards[i]}</th>${row}</tr>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>시너지 히트맵</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    table { border-collapse: collapse; }
    th, td { padding: 8px; text-align: center; border: 1px solid #333; min-width: 60px; }
    th { background: #16213e; }
  </style>
</head>
<body>
  <h1>🔗 카드 시너지 히트맵</h1>
  <table>
    <tr><th></th>${cards.map(c => `<th>${c}</th>`).join('')}</tr>
    ${cellsHtml}
  </table>
</body>
</html>`;
  }
}

// ==================== 유틸리티 함수 ====================

export function printSimulationSummary(result: SimulationResult): void {
  const report = new ReportGenerator();
  console.log(report.simulationReport(result));
}

export function printDeckAnalysis(analysis: DeckAnalysisResult): void {
  const report = new ReportGenerator();
  console.log(report.deckAnalysisReport(analysis));
}

export function printSynergyMatrix(matrix: SynergyMatrix): void {
  const heatmap = new HeatmapGenerator();
  console.log(heatmap.synergyHeatmap(matrix));
  console.log(NetworkGraph.drawSynergyNetwork(matrix.topPairs));
}
