/**
 * Godot 포팅을 위한 데이터 JSON 내보내기 스크립트
 *
 * 실행: npx tsx scripts/export-data-to-json.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터 임포트
import { CARDS, TRAITS, DEFAULT_STARTING_DECK } from '../src/components/battle/battleData';
import { TOKENS, TOKEN_TYPES, TOKEN_CATEGORIES } from '../src/data/tokens';
import { RELICS, RELIC_RARITIES, RELIC_TAGS } from '../src/data/relics';
import { ITEMS } from '../src/data/items';
import { ANOMALY_TYPES } from '../src/data/anomalies';
import { NEW_EVENT_LIBRARY } from '../src/data/newEvents';
import { ENEMY_PATTERNS } from '../src/data/enemyPatterns';
import { PRAYERS } from '../src/data/monsterEther';
import { CARD_PRICES, RELIC_PRICES, SERVICE_PRICES, LOYALTY_DISCOUNTS } from '../src/data/shop';
import { PERSONALITY_TRAITS, TRAIT_NAME_TO_ID } from '../src/data/reflections';
import { BASE_ETHOS, TIER3_ETHOS, TIER5_ETHOS, ETHOS_NODES } from '../src/data/growth/ethosData';
import { TIER2_PATHOS, TIER4_PATHOS, TIER6_PATHOS, PATHOS_NODES } from '../src/data/growth/pathosData';
import { LOGOS } from '../src/data/growth/logosData';
import { IDENTITIES } from '../src/data/growth/identityData';

// 출력 디렉토리
const OUTPUT_DIR = path.join(__dirname, '../src/data/export');

// 디렉토리 생성
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * React 컴포넌트(icon 등)를 제거하고 JSON 직렬화 가능하게 변환
 */
function sanitizeForJson(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForJson);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // React 컴포넌트(icon)는 건너뛰고 iconKey만 유지
    if (key === 'icon' && typeof value === 'function') {
      continue;
    }
    const sanitized = sanitizeForJson(value);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  return result;
}

/**
 * JSON 파일로 저장
 */
function exportToJson(filename: string, data: unknown) {
  const sanitized = sanitizeForJson(data);
  const filepath = path.join(OUTPUT_DIR, `${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(sanitized, null, 2), 'utf-8');
  console.log(`✅ Exported: ${filename}.json`);
}

// ========================================
// 데이터 내보내기
// ========================================

console.log('🚀 Godot 포팅용 JSON 내보내기 시작...\n');

// 1. 카드 데이터
exportToJson('cards', CARDS);
exportToJson('traits', TRAITS);
exportToJson('starting-deck', DEFAULT_STARTING_DECK);

// 2. 토큰 데이터
exportToJson('tokens', TOKENS);
exportToJson('token-types', TOKEN_TYPES);
exportToJson('token-categories', TOKEN_CATEGORIES);

// 3. 상징(유물) 데이터
exportToJson('relics', RELICS);
exportToJson('relic-rarities', RELIC_RARITIES);
exportToJson('relic-tags', RELIC_TAGS);

// 4. 아이템 데이터
exportToJson('items', ITEMS);

// 5. 이변 데이터
exportToJson('anomalies', ANOMALY_TYPES);

// 6. 이벤트 데이터
exportToJson('events', NEW_EVENT_LIBRARY);

// 7. 적 패턴 및 기원 데이터
exportToJson('enemy-patterns', ENEMY_PATTERNS);
exportToJson('prayers', PRAYERS);

// 8. 상점 가격 데이터
exportToJson('shop-prices', {
  cards: CARD_PRICES,
  relics: RELIC_PRICES,
  services: SERVICE_PRICES,
  loyaltyDiscounts: LOYALTY_DISCOUNTS,
});

// 9. 개성 데이터
exportToJson('personality-traits', PERSONALITY_TRAITS);
exportToJson('trait-name-to-id', TRAIT_NAME_TO_ID);

// 10. 성장 시스템 데이터
exportToJson('ethos', {
  base: BASE_ETHOS,
  tier3: TIER3_ETHOS,
  tier5: TIER5_ETHOS,
  nodes: ETHOS_NODES,
});

exportToJson('pathos', {
  tier2: TIER2_PATHOS,
  tier4: TIER4_PATHOS,
  tier6: TIER6_PATHOS,
  nodes: PATHOS_NODES,
});

exportToJson('logos', LOGOS);
exportToJson('identities', IDENTITIES);

console.log(`\n✨ 완료! 출력 경로: ${OUTPUT_DIR}`);
