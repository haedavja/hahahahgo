/**
 * 노션 API 직접 호출 헬퍼
 */

/* eslint-disable no-undef */
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const NOTION_VERSION = '2022-06-28';

async function notionRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.notion.com/v1${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return response.json();
}

// 페이지 검색
async function searchPages(query = '') {
  return notionRequest('/search', 'POST', {
    query,
    page_size: 10
  });
}

// 페이지 조회
async function getPage(pageId) {
  return notionRequest(`/pages/${pageId}`);
}

// 블록 조회
async function getBlocks(blockId) {
  return notionRequest(`/blocks/${blockId}/children`);
}

// 데이터베이스 쿼리
async function queryDatabase(databaseId, filter = null) {
  return notionRequest(`/databases/${databaseId}/query`, 'POST', { filter });
}

export { searchPages, getPage, getBlocks, queryDatabase, notionRequest };
