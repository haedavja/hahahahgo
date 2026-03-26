/**
 * @file export.ts
 * @description 시뮬레이션 결과 내보내기 시스템 (JSON, CSV, Markdown, HTML)
 */

import type { SimulationResult, SimulationSummary, BattleResult } from './types';

// ==================== 타입 정의 ====================

export type ExportFormat = 'json' | 'csv' | 'markdown' | 'html' | 'tsv';

export interface ExportOptions {
  format: ExportFormat;
  includeRawData?: boolean;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeCardStats?: boolean;
  includeEnemyStats?: boolean;
  prettyPrint?: boolean;
  filename?: string;
}

export interface ExportResult {
  content: string;
  mimeType: string;
  filename: string;
  size: number;
}

// ==================== 내보내기 유틸리티 ====================

export class ResultExporter {
  /**
   * 결과 내보내기
   */
  export(result: SimulationResult, options: ExportOptions): ExportResult {
    switch (options.format) {
      case 'json':
        return this.exportJSON(result, options);
      case 'csv':
        return this.exportCSV(result, options);
      case 'tsv':
        return this.exportTSV(result, options);
      case 'markdown':
        return this.exportMarkdown(result, options);
      case 'html':
        return this.exportHTML(result, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * JSON 내보내기
   */
  private exportJSON(result: SimulationResult, options: ExportOptions): ExportResult {
    const data: Record<string, unknown> = {
      timestamp: result.timestamp,
      duration: result.duration,
    };

    if (options.includeSummary !== false) {
      data.summary = result.summary;
    }

    if (options.includeCardStats !== false) {
      data.cardEfficiency = result.summary.cardEfficiency;
    }

    if (options.includeRawData) {
      data.battles = result.results;
    }

    const content = options.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    return {
      content,
      mimeType: 'application/json',
      filename: options.filename || `simulation_${Date.now()}.json`,
      size: content.length,
    };
  }

  /**
   * CSV 내보내기
   */
  private exportCSV(result: SimulationResult, options: ExportOptions): ExportResult {
    const rows: string[] = [];

    // 요약 섹션
    if (options.includeSummary !== false) {
      rows.push('# Summary');
      rows.push('Metric,Value');
      rows.push(`Total Battles,${result.summary.totalBattles}`);
      rows.push(`Wins,${result.summary.wins}`);
      rows.push(`Losses,${result.summary.losses}`);
      rows.push(`Draws,${result.summary.draws}`);
      rows.push(`Win Rate,${(result.summary.winRate * 100).toFixed(2)}%`);
      rows.push(`Avg Turns,${result.summary.avgTurns.toFixed(2)}`);
      rows.push(`Avg Player Damage,${result.summary.avgPlayerDamage.toFixed(2)}`);
      rows.push(`Avg Enemy Damage,${result.summary.avgEnemyDamage.toFixed(2)}`);
      rows.push('');
    }

    // 카드 효율 섹션
    if (options.includeCardStats !== false && result.summary.cardEfficiency) {
      rows.push('# Card Efficiency');
      rows.push('Card ID,Uses,Avg Damage');
      for (const [cardId, stats] of Object.entries(result.summary.cardEfficiency)) {
        rows.push(`${cardId},${stats.uses},${stats.avgDamage.toFixed(2)}`);
      }
      rows.push('');
    }

    // 원시 데이터 섹션
    if (options.includeRawData) {
      rows.push('# Battle Results');
      rows.push('Battle,Winner,Turns,Player HP,Enemy HP,Player Damage,Enemy Damage');
      result.results.forEach((battle, i) => {
        rows.push(
          `${i + 1},${battle.winner},${battle.turns},` +
          `${battle.playerFinalHp},${battle.enemyFinalHp},` +
          `${battle.playerDamageDealt},${battle.enemyDamageDealt}`
        );
      });
    }

    const content = rows.join('\n');
    return {
      content,
      mimeType: 'text/csv',
      filename: options.filename || `simulation_${Date.now()}.csv`,
      size: content.length,
    };
  }

  /**
   * TSV 내보내기
   */
  private exportTSV(result: SimulationResult, options: ExportOptions): ExportResult {
    const csvResult = this.exportCSV(result, options);
    return {
      content: csvResult.content.replace(/,/g, '\t'),
      mimeType: 'text/tab-separated-values',
      filename: options.filename || `simulation_${Date.now()}.tsv`,
      size: csvResult.content.length,
    };
  }

  /**
   * Markdown 내보내기
   */
  private exportMarkdown(result: SimulationResult, options: ExportOptions): ExportResult {
    const lines: string[] = [
      '# 시뮬레이션 결과 리포트',
      '',
      `**생성 시간**: ${new Date(result.timestamp).toISOString()}`,
      `**소요 시간**: ${(result.duration / 1000).toFixed(2)}초`,
      '',
    ];

    if (options.includeSummary !== false) {
      lines.push('## 요약');
      lines.push('');
      lines.push('| 지표 | 값 |');
      lines.push('|------|-----|');
      lines.push(`| 총 전투 수 | ${result.summary.totalBattles.toLocaleString()} |`);
      lines.push(`| 승리 | ${result.summary.wins.toLocaleString()} |`);
      lines.push(`| 패배 | ${result.summary.losses.toLocaleString()} |`);
      lines.push(`| 무승부 | ${result.summary.draws.toLocaleString()} |`);
      lines.push(`| **승률** | **${(result.summary.winRate * 100).toFixed(2)}%** |`);
      lines.push(`| 평균 턴 수 | ${result.summary.avgTurns.toFixed(1)} |`);
      lines.push(`| 평균 플레이어 피해 | ${result.summary.avgPlayerDamage.toFixed(1)} |`);
      lines.push(`| 평균 적 피해 | ${result.summary.avgEnemyDamage.toFixed(1)} |`);
      lines.push('');
    }

    if (options.includeCardStats !== false && result.summary.cardEfficiency) {
      lines.push('## 카드 효율');
      lines.push('');
      lines.push('| 카드 | 사용 횟수 | 평균 피해 |');
      lines.push('|------|----------|----------|');

      const sortedCards = Object.entries(result.summary.cardEfficiency)
        .sort((a, b) => b[1].uses - a[1].uses);

      for (const [cardId, stats] of sortedCards) {
        lines.push(`| ${cardId} | ${stats.uses} | ${stats.avgDamage.toFixed(1)} |`);
      }
      lines.push('');
    }

    if (options.includeCharts) {
      lines.push('## 승률 분포');
      lines.push('');
      lines.push(this.generateTextChart(result));
      lines.push('');
    }

    if (options.includeRawData) {
      lines.push('## 상세 결과');
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>전투 결과 펼치기</summary>');
      lines.push('');
      lines.push('| # | 결과 | 턴 | 플레이어 HP | 적 HP |');
      lines.push('|---|------|-----|------------|-------|');

      result.results.slice(0, 100).forEach((battle, i) => {
        const icon = battle.winner === 'player' ? '✅' : battle.winner === 'enemy' ? '❌' : '➖';
        lines.push(
          `| ${i + 1} | ${icon} | ${battle.turns} | ${battle.playerFinalHp} | ${battle.enemyFinalHp} |`
        );
      });

      if (result.results.length > 100) {
        lines.push(`| ... | ... | ... | ... | ... |`);
        lines.push(`| (${result.results.length - 100}개 더) | | | | |`);
      }

      lines.push('');
      lines.push('</details>');
    }

    const content = lines.join('\n');
    return {
      content,
      mimeType: 'text/markdown',
      filename: options.filename || `simulation_${Date.now()}.md`,
      size: content.length,
    };
  }

  /**
   * 텍스트 차트 생성
   */
  private generateTextChart(result: SimulationResult): string {
    const total = result.summary.totalBattles;
    const winPct = Math.round((result.summary.wins / total) * 50);
    const lossPct = Math.round((result.summary.losses / total) * 50);
    const drawPct = 50 - winPct - lossPct;

    return [
      '```',
      '승리  ' + '█'.repeat(winPct) + ' ' + (result.summary.winRate * 100).toFixed(1) + '%',
      '패배  ' + '░'.repeat(lossPct) + ' ' + ((result.summary.losses / total) * 100).toFixed(1) + '%',
      '무승부 ' + '▒'.repeat(Math.max(0, drawPct)) + ' ' + ((result.summary.draws / total) * 100).toFixed(1) + '%',
      '```',
    ].join('\n');
  }

  /**
   * HTML 내보내기
   */
  private exportHTML(result: SimulationResult, options: ExportOptions): ExportResult {
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>시뮬레이션 결과</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #e0e0e0; padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #4ade80; margin-bottom: 1rem; }
    h2 { color: #60a5fa; margin: 2rem 0 1rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .card {
      background: #1a1a2e; border-radius: 8px; padding: 1.5rem;
      border: 1px solid #333;
    }
    .card-label { color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .card-value { font-size: 2rem; font-weight: bold; }
    .win { color: #4ade80; }
    .lose { color: #f87171; }
    .neutral { color: #fbbf24; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #333; }
    th { background: #1a1a2e; color: #60a5fa; }
    tr:hover { background: #1a1a2e; }
    .chart-container { background: #1a1a2e; border-radius: 8px; padding: 1.5rem; margin-top: 1rem; }
    .bar { height: 24px; border-radius: 4px; margin: 0.5rem 0; display: flex; align-items: center; }
    .bar-win { background: linear-gradient(90deg, #4ade80, #22c55e); }
    .bar-lose { background: linear-gradient(90deg, #f87171, #ef4444); }
    .bar-draw { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    .bar-label { padding: 0 0.5rem; font-size: 0.85rem; }
    .progress-bg { background: #333; border-radius: 4px; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 시뮬레이션 결과 리포트</h1>
    <div class="meta">
      생성: ${new Date(result.timestamp).toLocaleString('ko-KR')} |
      소요: ${(result.duration / 1000).toFixed(2)}초
    </div>

    <h2>📈 요약</h2>
    <div class="grid">
      <div class="card">
        <div class="card-label">총 전투</div>
        <div class="card-value">${result.summary.totalBattles.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">승률</div>
        <div class="card-value win">${(result.summary.winRate * 100).toFixed(1)}%</div>
      </div>
      <div class="card">
        <div class="card-label">승리</div>
        <div class="card-value win">${result.summary.wins.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">패배</div>
        <div class="card-value lose">${result.summary.losses.toLocaleString()}</div>
      </div>
      <div class="card">
        <div class="card-label">평균 턴</div>
        <div class="card-value neutral">${result.summary.avgTurns.toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="card-label">평균 피해</div>
        <div class="card-value">${result.summary.avgPlayerDamage.toFixed(0)}</div>
      </div>
    </div>

    ${options.includeCharts ? this.generateHTMLChart(result) : ''}

    ${options.includeCardStats !== false ? this.generateCardTable(result) : ''}

    ${options.includeRawData ? this.generateBattleTable(result) : ''}
  </div>
</body>
</html>`;

    return {
      content: html,
      mimeType: 'text/html',
      filename: options.filename || `simulation_${Date.now()}.html`,
      size: html.length,
    };
  }

  /**
   * HTML 차트 생성
   */
  private generateHTMLChart(result: SimulationResult): string {
    const total = result.summary.totalBattles;
    const winPct = (result.summary.wins / total) * 100;
    const lossPct = (result.summary.losses / total) * 100;
    const drawPct = (result.summary.draws / total) * 100;

    return `
    <h2>📊 승패 분포</h2>
    <div class="chart-container">
      <div class="progress-bg">
        <div class="bar bar-win" style="width: ${winPct}%">
          <span class="bar-label">승리 ${winPct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="progress-bg">
        <div class="bar bar-lose" style="width: ${lossPct}%">
          <span class="bar-label">패배 ${lossPct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="progress-bg">
        <div class="bar bar-draw" style="width: ${Math.max(drawPct, 1)}%">
          <span class="bar-label">무승부 ${drawPct.toFixed(1)}%</span>
        </div>
      </div>
    </div>`;
  }

  /**
   * 카드 테이블 생성
   */
  private generateCardTable(result: SimulationResult): string {
    if (!result.summary.cardEfficiency) return '';

    const sortedCards = Object.entries(result.summary.cardEfficiency)
      .sort((a, b) => b[1].uses - a[1].uses);

    const rows = sortedCards.map(([cardId, stats]) => `
      <tr>
        <td>${cardId}</td>
        <td>${stats.uses.toLocaleString()}</td>
        <td>${stats.avgDamage.toFixed(1)}</td>
      </tr>
    `).join('');

    return `
    <h2>🃏 카드 효율</h2>
    <table>
      <thead>
        <tr>
          <th>카드</th>
          <th>사용 횟수</th>
          <th>평균 피해</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  /**
   * 배틀 테이블 생성
   */
  private generateBattleTable(result: SimulationResult): string {
    const rows = result.results.slice(0, 50).map((battle, i) => {
      const icon = battle.winner === 'player' ? '✅' : battle.winner === 'enemy' ? '❌' : '➖';
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${icon}</td>
          <td>${battle.turns}</td>
          <td>${battle.playerFinalHp}</td>
          <td>${battle.enemyFinalHp}</td>
        </tr>
      `;
    }).join('');

    return `
    <h2>⚔️ 전투 상세 (상위 50개)</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>결과</th>
          <th>턴</th>
          <th>플레이어 HP</th>
          <th>적 HP</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }
}

// ==================== 싱글톤 인스턴스 ====================

export const exporter = new ResultExporter();

// ==================== 헬퍼 함수 ====================

/**
 * 빠른 내보내기
 */
export function exportResult(result: SimulationResult, format: ExportFormat): ExportResult {
  return exporter.export(result, { format, prettyPrint: true });
}

/**
 * 여러 형식으로 내보내기
 */
export function exportMultiple(result: SimulationResult, formats: ExportFormat[]): ExportResult[] {
  return formats.map(format => exporter.export(result, { format, prettyPrint: true }));
}

/**
 * 비교 리포트 생성
 */
export function exportComparison(
  results: { name: string; result: SimulationResult }[],
  format: ExportFormat = 'markdown'
): ExportResult {
  if (format === 'markdown') {
    const lines = [
      '# 시뮬레이션 비교 리포트',
      '',
      '| 이름 | 전투 수 | 승률 | 평균 턴 | 평균 피해 |',
      '|------|---------|------|---------|----------|',
    ];

    for (const { name, result } of results) {
      lines.push(
        `| ${name} | ${result.summary.totalBattles} | ` +
        `${(result.summary.winRate * 100).toFixed(1)}% | ` +
        `${result.summary.avgTurns.toFixed(1)} | ` +
        `${result.summary.avgPlayerDamage.toFixed(0)} |`
      );
    }

    // 승률 기준 순위
    const sorted = [...results].sort((a, b) => b.result.summary.winRate - a.result.summary.winRate);
    lines.push('');
    lines.push('## 순위 (승률 기준)');
    lines.push('');
    sorted.forEach((r, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      lines.push(`${medal} **${r.name}**: ${(r.result.summary.winRate * 100).toFixed(1)}%`);
    });

    const content = lines.join('\n');
    return {
      content,
      mimeType: 'text/markdown',
      filename: `comparison_${Date.now()}.md`,
      size: content.length,
    };
  }

  // JSON 형식
  const data = results.map(r => ({
    name: r.name,
    ...r.result.summary,
  }));

  const content = JSON.stringify(data, null, 2);
  return {
    content,
    mimeType: 'application/json',
    filename: `comparison_${Date.now()}.json`,
    size: content.length,
  };
}
