/**
 * @file bundle-analysis.js
 * @description 번들 크기 분석 스크립트
 *
 * 빌드 결과물의 크기를 분석하고 보고합니다.
 * 실행: npm run perf:bundle
 */
/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist/assets');

// 파일 크기 포맷
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 크기 기준 색상 (터미널)
function getSizeColor(bytes) {
  if (bytes > 100 * 1024) return '\x1b[31m'; // 빨강 (>100KB)
  if (bytes > 50 * 1024) return '\x1b[33m';  // 노랑 (>50KB)
  return '\x1b[32m'; // 초록 (<50KB)
}

const RESET = '\x1b[0m';

// 메인 실행
function main() {
  console.log('\n📦 Bundle Size Analysis\n');
  console.log('='.repeat(70));

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

  // 크기순 정렬
  jsFiles.sort((a, b) => b.size - a.size);

  // 출력
  console.log('File'.padEnd(50) + 'Size'.padStart(15));
  console.log('-'.repeat(70));

  let totalSize = 0;
  let largeFiles = 0;

  for (const file of jsFiles) {
    const color = getSizeColor(file.size);
    console.log(
      `${color}${file.name.padEnd(50)}${formatBytes(file.size).padStart(15)}${RESET}`
    );
    totalSize += file.size;
    if (file.size > 100 * 1024) largeFiles++;
  }

  console.log('='.repeat(70));
  console.log(`${'Total'.padEnd(50)}${formatBytes(totalSize).padStart(15)}`);

  // CSS 파일 분석
  const cssFiles = files.filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    console.log('\n📄 CSS Files:');
    for (const f of cssFiles) {
      const stats = fs.statSync(path.join(DIST_DIR, f));
      console.log(`  ${f}: ${formatBytes(stats.size)}`);
    }
  }

  // 요약
  console.log('\n📋 Summary:');
  console.log(`  📁 Total JS files: ${jsFiles.length}`);
  console.log(`  📦 Total JS size: ${formatBytes(totalSize)}`);
  console.log(`  ⚠️  Large files (>100KB): ${largeFiles}`);

  // 권장사항
  if (largeFiles > 0) {
    console.log('\n💡 Recommendations:');
    console.log('  - Consider code splitting for large files');
    console.log('  - Use dynamic imports for rarely used features');
    console.log('  - Check for duplicate dependencies');
  }

  // Top 5 largest
  console.log('\n🔝 Top 5 Largest Files:');
  jsFiles.slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (${formatBytes(f.size)})`);
  });
}

main();
