/**
 * @file html.ts
 * @description HTML 리포트 생성기 - 시뮬레이션 결과를 시각적 리포트로 변환
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type {
  SimulationResult,
  SimulationSummary,
  ABTestResult,
  BalanceAnalysis,
  BattleResult,
} from '../core/types';

// ==================== 리포트 생성기 ====================

export interface ReportOptions {
  title?: string;
  outputDir?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  theme?: 'light' | 'dark';
}

export class HtmlReportGenerator {
  private options: Required<ReportOptions>;

  constructor(options: ReportOptions = {}) {
    this.options = {
      title: options.title || '시뮬레이션 리포트',
      outputDir: options.outputDir || './reports',
      includeCharts: options.includeCharts ?? true,
      includeRawData: options.includeRawData ?? false,
      theme: options.theme || 'dark',
    };

    if (!existsSync(this.options.outputDir)) {
      mkdirSync(this.options.outputDir, { recursive: true });
    }
  }

  // ==================== 메인 리포트 ====================

  generateSimulationReport(result: SimulationResult): string {
    const html = this.buildHtml({
      title: `${this.options.title} - 시뮬레이션 결과`,
      content: `
        ${this.renderHeader(result)}
        ${this.renderSummaryCards(result.summary)}
        ${this.renderWinRateChart(result.summary)}
        ${this.renderCardEfficiencyTable(result.summary)}
        ${this.renderBattleDistribution(result.results)}
        ${this.options.includeRawData ? this.renderRawData(result) : ''}
      `,
    });

    const filename = `simulation-${Date.now()}.html`;
    const filepath = join(this.options.outputDir, filename);
    writeFileSync(filepath, html, 'utf-8');

    return filepath;
  }

  generateABTestReport(result: ABTestResult): string {
    const html = this.buildHtml({
      title: `${this.options.title} - A/B 테스트 결과`,
      content: `
        ${this.renderABTestHeader(result)}
        ${this.renderABComparison(result)}
        ${this.renderABCharts(result)}
        ${this.renderABConclusion(result)}
      `,
    });

    const filename = `abtest-${Date.now()}.html`;
    const filepath = join(this.options.outputDir, filename);
    writeFileSync(filepath, html, 'utf-8');

    return filepath;
  }

  generateBalanceReport(analyses: BalanceAnalysis[]): string {
    const html = this.buildHtml({
      title: `${this.options.title} - 밸런스 분석`,
      content: `
        ${this.renderBalanceOverview(analyses)}
        ${this.renderBalanceCards(analyses)}
        ${this.renderBalanceRecommendations(analyses)}
      `,
    });

    const filename = `balance-${Date.now()}.html`;
    const filepath = join(this.options.outputDir, filename);
    writeFileSync(filepath, html, 'utf-8');

    return filepath;
  }

  // ==================== HTML 템플릿 ====================

  private buildHtml({ title, content }: { title: string; content: string }): string {
    const isDark = this.options.theme === 'dark';

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-primary: ${isDark ? '#1a1a2e' : '#ffffff'};
      --bg-secondary: ${isDark ? '#16213e' : '#f5f5f5'};
      --bg-card: ${isDark ? '#0f3460' : '#ffffff'};
      --text-primary: ${isDark ? '#e8e8e8' : '#333333'};
      --text-secondary: ${isDark ? '#b8b8b8' : '#666666'};
      --accent: #e94560;
      --success: #4ade80;
      --warning: #fbbf24;
      --info: #60a5fa;
      --border: ${isDark ? '#2a2a4a' : '#e0e0e0'};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
      border-radius: 16px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(45deg, var(--accent), var(--info));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header .meta {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 24px;
      border: 1px solid var(--border);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .stat-card .label {
      color: var(--text-secondary);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .stat-card .value {
      font-size: 2rem;
      font-weight: bold;
    }

    .stat-card .value.success { color: var(--success); }
    .stat-card .value.warning { color: var(--warning); }
    .stat-card .value.info { color: var(--info); }
    .stat-card .value.accent { color: var(--accent); }

    .chart-container {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid var(--border);
    }

    .chart-container h3 {
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .chart-wrapper {
      position: relative;
      height: 300px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    table th, table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    table th {
      background: var(--bg-secondary);
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      font-size: 0.8rem;
      letter-spacing: 0.5px;
    }

    table tr:hover td {
      background: var(--bg-secondary);
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .badge.success { background: rgba(74, 222, 128, 0.2); color: var(--success); }
    .badge.warning { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
    .badge.danger { background: rgba(233, 69, 96, 0.2); color: var(--accent); }
    .badge.info { background: rgba(96, 165, 250, 0.2); color: var(--info); }

    .progress-bar {
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar .fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .section {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      border: 1px solid var(--border);
    }

    .section h3 {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 20px;
      align-items: center;
    }

    .comparison-item {
      text-align: center;
      padding: 20px;
    }

    .comparison-vs {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--accent);
    }

    .conclusion-box {
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }

    .conclusion-box.success { background: rgba(74, 222, 128, 0.1); border-left: 4px solid var(--success); }
    .conclusion-box.warning { background: rgba(251, 191, 36, 0.1); border-left: 4px solid var(--warning); }
    .conclusion-box.info { background: rgba(96, 165, 250, 0.1); border-left: 4px solid var(--info); }

    @media (max-width: 768px) {
      .header h1 { font-size: 1.8rem; }
      .stat-card .value { font-size: 1.5rem; }
      .comparison-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
  }

  // ==================== 컴포넌트 렌더링 ====================

  private renderHeader(result: SimulationResult): string {
    const date = new Date(result.timestamp).toLocaleString('ko-KR');
    const duration = (result.duration / 1000).toFixed(2);

    return `
      <div class="header">
        <h1>🎮 시뮬레이션 리포트</h1>
        <p class="meta">
          생성: ${date} | 소요 시간: ${duration}초 | 전투 수: ${result.summary.totalBattles}
        </p>
      </div>
    `;
  }

  private renderSummaryCards(summary: SimulationSummary): string {
    const winRate = (summary.winRate * 100).toFixed(1);
    const winRateClass = summary.winRate >= 0.6 ? 'success' : summary.winRate >= 0.4 ? 'warning' : 'accent';

    return `
      <div class="cards-grid">
        <div class="stat-card">
          <div class="label">승률</div>
          <div class="value ${winRateClass}">${winRate}%</div>
          <div class="progress-bar">
            <div class="fill" style="width: ${winRate}%; background: var(--${winRateClass});"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="label">승리</div>
          <div class="value success">${summary.wins}</div>
        </div>
        <div class="stat-card">
          <div class="label">패배</div>
          <div class="value accent">${summary.losses}</div>
        </div>
        <div class="stat-card">
          <div class="label">무승부</div>
          <div class="value info">${summary.draws}</div>
        </div>
        <div class="stat-card">
          <div class="label">평균 턴</div>
          <div class="value info">${summary.avgTurns.toFixed(1)}</div>
        </div>
        <div class="stat-card">
          <div class="label">평균 피해량</div>
          <div class="value warning">${summary.avgPlayerDamage.toFixed(0)}</div>
        </div>
      </div>
    `;
  }

  private renderWinRateChart(summary: SimulationSummary): string {
    if (!this.options.includeCharts) return '';

    return `
      <div class="chart-container">
        <h3>📊 전투 결과 분포</h3>
        <div class="chart-wrapper">
          <canvas id="winRateChart"></canvas>
        </div>
      </div>
      <script>
        new Chart(document.getElementById('winRateChart'), {
          type: 'doughnut',
          data: {
            labels: ['승리', '패배', '무승부'],
            datasets: [{
              data: [${summary.wins}, ${summary.losses}, ${summary.draws}],
              backgroundColor: ['#4ade80', '#e94560', '#60a5fa'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '${this.options.theme === 'dark' ? '#e8e8e8' : '#333'}' }
              }
            }
          }
        });
      </script>
    `;
  }

  private renderCardEfficiencyTable(summary: SimulationSummary): string {
    const cards = Object.entries(summary.cardEfficiency)
      .sort((a, b) => b[1].uses - a[1].uses)
      .slice(0, 10);

    if (cards.length === 0) return '';

    const rows = cards.map(([cardId, stats]) => `
      <tr>
        <td><strong>${cardId}</strong></td>
        <td>${stats.uses}</td>
        <td>${stats.avgDamage.toFixed(1)}</td>
        <td>
          <span class="badge ${stats.avgDamage > 10 ? 'success' : stats.avgDamage > 5 ? 'warning' : 'info'}">
            ${stats.avgDamage > 10 ? '높음' : stats.avgDamage > 5 ? '보통' : '낮음'}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <h3>🃏 카드 효율 분석</h3>
        <table>
          <thead>
            <tr>
              <th>카드</th>
              <th>사용 횟수</th>
              <th>평균 피해</th>
              <th>효율</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  private renderBattleDistribution(results: BattleResult[]): string {
    if (!this.options.includeCharts || results.length < 10) return '';

    // 턴 수 분포 계산
    const turnBuckets: Record<string, number> = {};
    for (const result of results) {
      const bucket = Math.floor(result.turns / 3) * 3;
      const label = `${bucket}-${bucket + 2}턴`;
      turnBuckets[label] = (turnBuckets[label] || 0) + 1;
    }

    const labels = Object.keys(turnBuckets).sort();
    const data = labels.map(l => turnBuckets[l]);

    return `
      <div class="chart-container">
        <h3>📈 전투 길이 분포</h3>
        <div class="chart-wrapper">
          <canvas id="turnDistChart"></canvas>
        </div>
      </div>
      <script>
        new Chart(document.getElementById('turnDistChart'), {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              label: '전투 수',
              data: ${JSON.stringify(data)},
              backgroundColor: '#60a5fa',
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { ticks: { color: '${this.options.theme === 'dark' ? '#b8b8b8' : '#666'}' } },
              y: { ticks: { color: '${this.options.theme === 'dark' ? '#b8b8b8' : '#666'}' } }
            }
          }
        });
      </script>
    `;
  }

  private renderRawData(result: SimulationResult): string {
    return `
      <div class="section">
        <h3>📋 원시 데이터</h3>
        <pre style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.85rem;">
${JSON.stringify(result, null, 2)}
        </pre>
      </div>
    `;
  }

  // ==================== A/B 테스트 렌더링 ====================

  private renderABTestHeader(result: ABTestResult): string {
    return `
      <div class="header">
        <h1>🔬 A/B 테스트 결과</h1>
        <p class="meta">${result.config.name}: ${result.config.description}</p>
      </div>
    `;
  }

  private renderABComparison(result: ABTestResult): string {
    const controlWinRate = (result.controlResults.winRate * 100).toFixed(1);
    const variantWinRate = (result.variantResults.winRate * 100).toFixed(1);

    return `
      <div class="section">
        <h3>📊 결과 비교</h3>
        <div class="comparison-grid">
          <div class="comparison-item">
            <h4>Control</h4>
            <div class="stat-card">
              <div class="value info">${controlWinRate}%</div>
              <div class="label">승률</div>
            </div>
          </div>
          <div class="comparison-vs">VS</div>
          <div class="comparison-item">
            <h4>Variant</h4>
            <div class="stat-card">
              <div class="value accent">${variantWinRate}%</div>
              <div class="label">승률</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderABCharts(result: ABTestResult): string {
    if (!this.options.includeCharts) return '';

    return `
      <div class="chart-container">
        <h3>📈 상세 비교</h3>
        <div class="chart-wrapper">
          <canvas id="abCompareChart"></canvas>
        </div>
      </div>
      <script>
        new Chart(document.getElementById('abCompareChart'), {
          type: 'bar',
          data: {
            labels: ['승률 (%)', '평균 턴', '평균 피해'],
            datasets: [
              {
                label: 'Control',
                data: [
                  ${(result.controlResults.winRate * 100).toFixed(1)},
                  ${result.controlResults.avgTurns.toFixed(1)},
                  ${result.controlResults.avgPlayerDamage.toFixed(0)}
                ],
                backgroundColor: '#60a5fa'
              },
              {
                label: 'Variant',
                data: [
                  ${(result.variantResults.winRate * 100).toFixed(1)},
                  ${result.variantResults.avgTurns.toFixed(1)},
                  ${result.variantResults.avgPlayerDamage.toFixed(0)}
                ],
                backgroundColor: '#e94560'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '${this.options.theme === 'dark' ? '#e8e8e8' : '#333'}' } }
            },
            scales: {
              x: { ticks: { color: '${this.options.theme === 'dark' ? '#b8b8b8' : '#666'}' } },
              y: { ticks: { color: '${this.options.theme === 'dark' ? '#b8b8b8' : '#666'}' } }
            }
          }
        });
      </script>
    `;
  }

  private renderABConclusion(result: ABTestResult): string {
    const boxClass = result.winner === 'variant' ? 'success' : result.winner === 'control' ? 'info' : 'warning';

    return `
      <div class="section">
        <h3>🎯 결론</h3>
        <div class="conclusion-box ${boxClass}">
          <p><strong>승자: ${result.winner === 'variant' ? 'Variant' : result.winner === 'control' ? 'Control' : '결론 없음'}</strong></p>
          <p>통계적 유의성: ${(result.significance * 100).toFixed(1)}%</p>
          <p>${result.recommendation}</p>
        </div>
      </div>
    `;
  }

  // ==================== 밸런스 렌더링 ====================

  private renderBalanceOverview(analyses: BalanceAnalysis[]): string {
    const needsChange = analyses.filter(a => a.suggestedChanges.length > 0).length;

    return `
      <div class="header">
        <h1>⚖️ 밸런스 분석 리포트</h1>
        <p class="meta">분석된 카드: ${analyses.length}개 | 변경 필요: ${needsChange}개</p>
      </div>
    `;
  }

  private renderBalanceCards(analyses: BalanceAnalysis[]): string {
    const rows = analyses
      .filter(a => a.suggestedChanges.length > 0)
      .slice(0, 20)
      .map(a => {
        const changes = a.suggestedChanges.map(c =>
          `${c.stat}: ${c.currentValue} → ${c.suggestedValue}`
        ).join(', ');

        const impactClass = Math.abs(a.expectedWinRateChange) > 5 ? 'danger' :
          Math.abs(a.expectedWinRateChange) > 2 ? 'warning' : 'info';

        return `
          <tr>
            <td><strong>${a.cardId}</strong></td>
            <td>${changes || '-'}</td>
            <td><span class="badge ${impactClass}">${a.expectedWinRateChange > 0 ? '+' : ''}${a.expectedWinRateChange.toFixed(1)}%</span></td>
          </tr>
        `;
      }).join('');

    return `
      <div class="section">
        <h3>🃏 추천 변경사항</h3>
        <table>
          <thead>
            <tr>
              <th>카드</th>
              <th>변경 내용</th>
              <th>예상 승률 변화</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  private renderBalanceRecommendations(analyses: BalanceAnalysis[]): string {
    const highImpact = analyses.filter(a => Math.abs(a.expectedWinRateChange) > 5);
    const lowImpact = analyses.filter(a => a.suggestedChanges.length === 0);

    return `
      <div class="section">
        <h3>💡 권장사항</h3>
        <div class="conclusion-box info">
          <p><strong>고영향 카드:</strong> ${highImpact.length}개 - 우선 검토 필요</p>
          <p><strong>균형 잡힌 카드:</strong> ${lowImpact.length}개 - 변경 불필요</p>
        </div>
      </div>
    `;
  }
}

// ==================== 헬퍼 함수 ====================

export function generateQuickReport(result: SimulationResult, outputDir?: string): string {
  const generator = new HtmlReportGenerator({ outputDir });
  return generator.generateSimulationReport(result);
}

export function generateABReport(result: ABTestResult, outputDir?: string): string {
  const generator = new HtmlReportGenerator({ outputDir });
  return generator.generateABTestReport(result);
}
