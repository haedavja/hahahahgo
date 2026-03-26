/**
 * @file check-bundle-size.js
 * @description 번들 크기 예산 검사 스크립트
 *
 * 빌드 결과물이 예산을 초과하면 CI 실패
 * 실행: npm run check:bundle
 */
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist/assets');

// 번들 크기 예산 (bytes)
const BUDGETS = {
  // 개별 청크 최대 크기
  maxChunkSize: 350 * 1024,      // 350KB
  // 전체 JS 크기
  maxTotalJs: 1800 * 1024,       // 1.8MB
  // 전체 CSS 크기
  maxTotalCss: 100 * 1024,       // 100KB
  // 메인 번들 크기
  maxMainBundle: 300 * 1024,     // 300KB
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  console.log('\n📦 Bundle Size Budget Check\n');
  console.log('='.repeat(60));

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/assets 디렉토리가 없습니다. 먼저 빌드를 실행하세요.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js')).map(f => {
    const filePath = path.join(DIST_DIR, f);
    const stats = fs.statSync(filePath);
    return { name: f, size: stats.size };
  });

  const cssFiles = files.filter(f => f.endsWith('.css')).map(f => {
    const filePath = path.join(DIST_DIR, f);
    const stats = fs.statSync(filePath);
    return { name: f, size: stats.size };
  });

  let violations = [];
  let warnings = [];

  // 개별 청크 크기 검사
  console.log('\n📊 Chunk Size Analysis:');
  for (const file of jsFiles) {
    const status = file.size > BUDGETS.maxChunkSize ? '❌' : '✅';
    console.log(`  ${status} ${file.name}: ${formatBytes(file.size)}`);

    if (file.size > BUDGETS.maxChunkSize) {
      violations.push(`${file.name} (${formatBytes(file.size)}) exceeds ${formatBytes(BUDGETS.maxChunkSize)}`);
    } else if (file.size > BUDGETS.maxChunkSize * 0.8) {
      warnings.push(`${file.name} (${formatBytes(file.size)}) is approaching limit`);
    }
  }

  // 전체 JS 크기
  const totalJs = jsFiles.reduce((sum, f) => sum + f.size, 0);
  const jsStatus = totalJs > BUDGETS.maxTotalJs ? '❌' : '✅';
  console.log(`\n${jsStatus} Total JS: ${formatBytes(totalJs)} / ${formatBytes(BUDGETS.maxTotalJs)}`);

  if (totalJs > BUDGETS.maxTotalJs) {
    violations.push(`Total JS (${formatBytes(totalJs)}) exceeds budget (${formatBytes(BUDGETS.maxTotalJs)})`);
  }

  // 전체 CSS 크기
  const totalCss = cssFiles.reduce((sum, f) => sum + f.size, 0);
  const cssStatus = totalCss > BUDGETS.maxTotalCss ? '❌' : '✅';
  console.log(`${cssStatus} Total CSS: ${formatBytes(totalCss)} / ${formatBytes(BUDGETS.maxTotalCss)}`);

  if (totalCss > BUDGETS.maxTotalCss) {
    violations.push(`Total CSS (${formatBytes(totalCss)}) exceeds budget (${formatBytes(BUDGETS.maxTotalCss)})`);
  }

  // 메인 번들 검사
  const mainBundle = jsFiles.find(f => f.name.startsWith('index-'));
  if (mainBundle) {
    const mainStatus = mainBundle.size > BUDGETS.maxMainBundle ? '❌' : '✅';
    console.log(`${mainStatus} Main bundle: ${formatBytes(mainBundle.size)} / ${formatBytes(BUDGETS.maxMainBundle)}`);

    if (mainBundle.size > BUDGETS.maxMainBundle) {
      violations.push(`Main bundle (${formatBytes(mainBundle.size)}) exceeds budget (${formatBytes(BUDGETS.maxMainBundle)})`);
    }
  }

  // 결과 출력
  console.log('\n' + '='.repeat(60));

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (violations.length > 0) {
    console.log('\n❌ Budget Violations:');
    violations.forEach(v => console.log(`  - ${v}`));
    console.log('\n💡 Suggestions:');
    console.log('  - Use dynamic imports for rarely used features');
    console.log('  - Check for duplicate dependencies');
    console.log('  - Consider code splitting');
    console.log('\n');
    process.exit(1);
  }

  console.log('\n✅ All bundle size budgets passed!\n');

  // JSON 리포트 생성
  const report = {
    timestamp: new Date().toISOString(),
    budgets: BUDGETS,
    results: {
      totalJs,
      totalCss,
      mainBundle: mainBundle?.size || 0,
      chunks: jsFiles,
    },
    passed: true,
  };

  fs.writeFileSync(
    path.join(__dirname, '../bundle-report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('📄 Report saved to bundle-report.json\n');
}

main();
