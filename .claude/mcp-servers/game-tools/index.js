#!/usr/bin/env node
/**
 * 하하하GO 게임 개발 도구 MCP 서버
 *
 * 제공 기능:
 * - 카드 밸런스 분석
 * - 덱 통계
 * - 전투 시뮬레이션
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');

// 카드 데이터 로드 헬퍼
function loadCardsData() {
  try {
    const cardsPath = resolve(PROJECT_ROOT, 'src/data/cards.ts');
    if (!existsSync(cardsPath)) {
      return { error: '카드 데이터 파일을 찾을 수 없습니다.' };
    }
    const content = readFileSync(cardsPath, 'utf-8');
    return { content, path: cardsPath };
  } catch (e) {
    return { error: e.message };
  }
}

// 적 데이터 로드 헬퍼
function loadEnemiesData() {
  try {
    const enemiesPath = resolve(PROJECT_ROOT, 'src/components/battle/battleData.ts');
    if (!existsSync(enemiesPath)) {
      return { error: '적 데이터 파일을 찾을 수 없습니다.' };
    }
    const content = readFileSync(enemiesPath, 'utf-8');
    return { content, path: enemiesPath };
  } catch (e) {
    return { error: e.message };
  }
}

// 상징 데이터 로드 헬퍼
function loadRelicsData() {
  try {
    const relicsPath = resolve(PROJECT_ROOT, 'src/data/relics.ts');
    if (!existsSync(relicsPath)) {
      return { error: '상징 데이터 파일을 찾을 수 없습니다.' };
    }
    const content = readFileSync(relicsPath, 'utf-8');
    return { content, path: relicsPath };
  } catch (e) {
    return { error: e.message };
  }
}

// 카드 밸런스 분석
function analyzeCardBalance(cardType) {
  const data = loadCardsData();
  if (data.error) return data.error;

  const analysis = {
    type: cardType || 'all',
    summary: '카드 데이터를 분석하려면 cards.ts 파일을 직접 읽어야 합니다.',
    file: data.path,
    recommendations: [
      '공격 카드: 데미지/속도 비율 확인',
      '방어 카드: 방어력/속도 비율 확인',
      '스킬 카드: 효과 가치 평가',
    ]
  };

  return JSON.stringify(analysis, null, 2);
}

// 덱 통계 분석
function analyzeDeckStats() {
  const data = loadCardsData();
  if (data.error) return data.error;

  const stats = {
    summary: '덱 통계를 분석하려면 cards.ts와 현재 게임 상태를 확인해야 합니다.',
    metrics: [
      '카드 타입 분포',
      '평균 속도 비용',
      '평균 데미지',
      '특성 분포',
    ],
    file: data.path
  };

  return JSON.stringify(stats, null, 2);
}

// 게임 데이터 요약
function getGameDataSummary() {
  const cards = loadCardsData();
  const enemies = loadEnemiesData();
  const relics = loadRelicsData();

  return JSON.stringify({
    cards: cards.error ? { error: cards.error } : { path: cards.path, status: 'loaded' },
    enemies: enemies.error ? { error: enemies.error } : { path: enemies.path, status: 'loaded' },
    relics: relics.error ? { error: relics.error } : { path: relics.path, status: 'loaded' },
    projectRoot: PROJECT_ROOT
  }, null, 2);
}

// MCP 서버 설정
const server = new Server(
  {
    name: 'hahahahgo-game-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_card_balance',
        description: '카드 밸런스를 분석합니다. 데미지/속도 비율, 특성 가치 등을 평가합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            cardType: {
              type: 'string',
              description: '분석할 카드 타입 (attack, defense, skill, all)',
              enum: ['attack', 'defense', 'skill', 'all']
            }
          }
        }
      },
      {
        name: 'analyze_deck_stats',
        description: '현재 덱의 통계를 분석합니다. 카드 분포, 평균 비용 등을 확인합니다.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_game_data_summary',
        description: '게임 데이터 파일들의 위치와 상태를 요약합니다.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'find_balance_issues',
        description: '잠재적인 밸런스 문제를 찾습니다.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: '분석 카테고리 (cards, enemies, relics)',
              enum: ['cards', 'enemies', 'relics']
            }
          },
          required: ['category']
        }
      },
      {
        name: 'suggest_card_stats',
        description: '새 카드의 적절한 스탯을 제안합니다.',
        inputSchema: {
          type: 'object',
          properties: {
            cardType: {
              type: 'string',
              description: '카드 타입',
              enum: ['attack', 'defense', 'skill']
            },
            targetPower: {
              type: 'string',
              description: '목표 강도 (weak, normal, strong)',
              enum: ['weak', 'normal', 'strong']
            }
          },
          required: ['cardType', 'targetPower']
        }
      }
    ]
  };
});

// 도구 실행
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'analyze_card_balance':
      return {
        content: [{ type: 'text', text: analyzeCardBalance(args?.cardType) }]
      };

    case 'analyze_deck_stats':
      return {
        content: [{ type: 'text', text: analyzeDeckStats() }]
      };

    case 'get_game_data_summary':
      return {
        content: [{ type: 'text', text: getGameDataSummary() }]
      };

    case 'find_balance_issues': {
      const category = args?.category || 'cards';
      let dataLoader;
      switch (category) {
        case 'enemies': dataLoader = loadEnemiesData; break;
        case 'relics': dataLoader = loadRelicsData; break;
        default: dataLoader = loadCardsData;
      }
      const data = dataLoader();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            category,
            file: data.path || 'unknown',
            status: data.error ? 'error' : 'ready',
            hint: '파일을 직접 분석하여 밸런스 이슈를 찾아주세요.'
          }, null, 2)
        }]
      };
    }

    case 'suggest_card_stats': {
      const { cardType, targetPower } = args || {};
      const suggestions = {
        attack: {
          weak: { damage: '5-8', speedCost: '2-3', actionCost: 1 },
          normal: { damage: '10-15', speedCost: '4-5', actionCost: 1 },
          strong: { damage: '18-25', speedCost: '6-8', actionCost: 2 }
        },
        defense: {
          weak: { block: '5-8', speedCost: '2-3', actionCost: 1 },
          normal: { block: '10-15', speedCost: '4-5', actionCost: 1 },
          strong: { block: '18-25', speedCost: '6-8', actionCost: 2 }
        },
        skill: {
          weak: { effect: '약한 버프/디버프', speedCost: '2-3', actionCost: 1 },
          normal: { effect: '중간 버프/디버프', speedCost: '4-5', actionCost: 1 },
          strong: { effect: '강력한 버프/디버프', speedCost: '6-8', actionCost: 2 }
        }
      };
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            cardType,
            targetPower,
            suggestedStats: suggestions[cardType]?.[targetPower] || '알 수 없는 조합'
          }, null, 2)
        }]
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `알 수 없는 도구: ${name}` }]
      };
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('하하하GO 게임 도구 MCP 서버가 시작되었습니다.');
}

main().catch(console.error);
