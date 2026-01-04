import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NOTION_VERSION = "2022-06-28";
const DEFAULT_DATABASE_ID = "b67a8082-de7c-4bb2-a966-1fb333d9ed1c"; // 총정리
const DEFAULT_PARENT_PAGE_ID = "09873372-f0c4-4259-b1ee-14be0d748884"; // 테르미누스
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatKstIsoWithOffset(date = new Date()) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = pad2(kst.getUTCMonth() + 1);
  const d = pad2(kst.getUTCDate());
  const hh = pad2(kst.getUTCHours());
  const mm = pad2(kst.getUTCMinutes());
  const ss = pad2(kst.getUTCSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`;
}

function usage() {
  console.log(
    [
      "사용법:",
      "  node scripts/notion-terminus.mjs setup [--apply] [--database <id>] [--parent <pageId>]",
      "  node scripts/notion-terminus.mjs normalize-related [--apply] [--database <id>]",
      "  node scripts/notion-terminus.mjs analyze [--database <id>]",
      "  node scripts/notion-terminus.mjs autoclassify [--apply] [--limit <n>] [--force] [--database <id>]",
      "  node scripts/notion-terminus.mjs autorole [--apply] [--limit <n>] [--force] [--strict] [--database <id>]",
      "  node scripts/notion-terminus.mjs export-graph [--out <path>] [--database <id>]",
      "",
      "필수:",
      "  NOTION_TOKEN (Integration 토큰)",
      "",
      "팁:",
      "  repo 루트에 `.env.local` 파일을 만들고 NOTION_TOKEN=... 을 넣으면 자동으로 읽습니다.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const cmd = args[0];
  const flags = new Map();
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      flags.set(key, next);
      i++;
    } else {
      flags.set(key, true);
    }
  }
  return { cmd, flags };
}

function getRepoRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..");
}

function loadEnvLocal() {
  const root = getRepoRoot();
  const envLocalPath = path.join(root, ".env.local");
  if (!fs.existsSync(envLocalPath)) return;
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeNotionId(id) {
  if (!id) throw new Error("id가 비었습니다.");
  const raw = String(id).replace(/-/g, "").trim();
  if (!/^[0-9a-fA-F]{32}$/.test(raw)) return id;
  return (
    raw.slice(0, 8) +
    "-" +
    raw.slice(8, 12) +
    "-" +
    raw.slice(12, 16) +
    "-" +
    raw.slice(16, 20) +
    "-" +
    raw.slice(20)
  ).toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function notionFetch(method, url, body) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN이 설정되어 있지 않습니다. (.env.local 권장)");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };

  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await resp.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (resp.status === 429) {
      const ra = resp.headers.get("retry-after");
      const raSec = ra ? Number(ra) : NaN;
      const waitMs = Number.isFinite(raSec) && raSec > 0 ? Math.ceil(raSec * 1000) : Math.min(15000, 900 * attempt * attempt);
      console.log(`[Notion 429] rate limited. wait ${waitMs}ms (attempt ${attempt}/${maxAttempts})`);
      await sleep(waitMs);
      continue;
    }

    if (!resp.ok) {
      const msg = json?.message || json?.error || text || `${resp.status}`;
      throw new Error(`[Notion ${resp.status}] ${msg}`);
    }
    return json;
  }

  throw new Error("[Notion 429] rate limited. too many retries.");
}

async function getMe() {
  return notionFetch("GET", "https://api.notion.com/v1/users/me");
}

async function getDatabase(databaseId) {
  const id = normalizeNotionId(databaseId);
  return notionFetch("GET", `https://api.notion.com/v1/databases/${id}`);
}

async function patchDatabase(databaseId, patch) {
  const id = normalizeNotionId(databaseId);
  return notionFetch("PATCH", `https://api.notion.com/v1/databases/${id}`, patch);
}

async function queryDatabase(databaseId, payload) {
  const id = normalizeNotionId(databaseId);
  return notionFetch("POST", `https://api.notion.com/v1/databases/${id}/query`, payload);
}

async function createPage(payload) {
  return notionFetch("POST", "https://api.notion.com/v1/pages", payload);
}

async function appendBlockChildren(blockId, children) {
  const id = normalizeNotionId(blockId);
  return notionFetch("PATCH", `https://api.notion.com/v1/blocks/${id}/children`, {
    children,
  });
}

async function patchPage(pageId, patch) {
  const id = normalizeNotionId(pageId);
  return notionFetch("PATCH", `https://api.notion.com/v1/pages/${id}`, patch);
}

function uniq(arr) {
  return [...new Set(arr)];
}

function splitCommaTag(tag) {
  return String(tag)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function getTitleFromDatabasePage(page, titlePropName) {
  const prop = page?.properties?.[titlePropName];
  if (!prop || prop.type !== "title") return "";
  return (prop.title || []).map((t) => t.plain_text).join("");
}

function findDatabaseTitlePropName(database) {
  const props = database?.properties || {};
  for (const [name, def] of Object.entries(props)) {
    if (def?.type === "title") return name;
  }
  return "Name";
}

function getSelectName(page, propName) {
  const prop = page?.properties?.[propName];
  if (!prop) return null;
  if (prop.type === "select") return prop.select?.name || null;
  return null;
}

function getMultiSelectNames(page, propName) {
  const prop = page?.properties?.[propName];
  if (!prop) return [];
  if (prop.type === "multi_select") return (prop.multi_select || []).map((o) => o.name).filter(Boolean);
  return [];
}

function getDateStart(page, propName) {
  const prop = page?.properties?.[propName];
  if (!prop) return null;
  if (prop.type !== "date") return null;
  return prop.date?.start || null;
}

function getRichTextPlain(page, propName) {
  const prop = page?.properties?.[propName];
  if (!prop) return "";
  if (prop.type === "rich_text") return (prop.rich_text || []).map((t) => t.plain_text).join("");
  if (prop.type === "title") return (prop.title || []).map((t) => t.plain_text).join("");
  return "";
}

function countBy(arr) {
  const counts = new Map();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  return counts;
}

function topNFromCountMap(countMap, n) {
  return [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function inferCategoryFromRelated(related) {
  const tags = new Set(related);
  const hasAny = (...candidates) => candidates.some((c) => tags.has(c));

  if (hasAny("시스템", "게임", "룰", "밸런스", "스탯", "스킬")) return "시스템(게임)";
  if (hasAny("스토리", "플롯", "에피소드", "개연성", "서사")) return "플롯/에피소드";

  if (hasAny("인물", "캐릭터")) return "인물";
  if (hasAny("세력", "정부", "국가", "제국", "왕국", "교단", "조직", "배교자")) return "세력";
  if (hasAny("지역", "장소", "도시", "행성", "던전", "공허", "지옥")) return "장소/지역";
  if (hasAny("역사", "전쟁", "사건")) return "역사/사건";
  if (hasAny("초법", "마법", "주술", "진법")) return "초법";
  if (hasAny("기술", "과학", "공학")) return "기술";
  if (hasAny("병기", "병과", "군사", "편제", "전술", "전투", "유닛", "기사")) return "군사";
  if (hasAny("유물", "아이템", "소모품", "재료", "월물")) return "유물/아이템";
  if (hasAny("용어", "개념", "직업", "직위")) return "용어/개념";

  if (hasAny("메타", "핵심")) return "메타";
  if (hasAny("설정")) return "설정";

  return null;
}

function inferRoleFromCategory(category) {
  const c = String(category || "").trim();
  if (!c) return null;

  // 존재: 무엇이 존재하는가
  if (c === "인물" || c === "세력" || c === "장소/지역" || c === "유물/아이템") return "존재";

  // 사건: 무슨 일이 일어났는가
  if (c === "역사/사건" || c === "플롯/에피소드") return "사건";

  // 구조: 세계는 어떻게 작동하는가
  if (c === "초법" || c === "기술" || c === "군사" || c === "시스템(게임)" || c === "용어/개념") return "구조";
  if (c === "설정" || c === "메타") return "구조";

  return null;
}

function inferRoleFromRelated(related) {
  const tags = new Set(related);
  const hasAny = (...candidates) => candidates.some((c) => tags.has(c));

  if (hasAny("결과", "귀결", "후유증", "변화", "영향", "파급")) return "결과";

  if (
    hasAny(
      "인물",
      "캐릭터",
      "세력",
      "정부",
      "국가",
      "제국",
      "왕국",
      "교단",
      "조직",
      "배교자",
      "지역",
      "장소",
      "도시",
      "행성",
    )
  )
    return "존재";
  if (hasAny("사건", "역사", "전쟁", "플롯", "에피소드", "서사")) return "사건";
  if (hasAny("시스템", "게임", "룰", "밸런스", "스탯", "스킬", "초법", "마법", "주술", "진법", "기술", "과학", "공학"))
    return "구조";

  return null;
}

function inferRole({ category, related, strict }) {
  const fromCategory = inferRoleFromCategory(category);
  if (fromCategory) return fromCategory;

  const fromRelated = inferRoleFromRelated(related || []);
  if (fromRelated) return fromRelated;

  if (strict) return null;

  // 단서가 부족하면 최소한 "미지정_*"로 수납해서 폭발을 막는다.
  return "미지정_구조";
}

function inferDomains(category, related) {
  const tags = new Set(related);
  const domains = new Set();

  if (category === "시스템(게임)" || ["시스템", "게임", "룰", "밸런스"].some((t) => tags.has(t))) {
    domains.add("게임");
  }
  if (category === "플롯/에피소드" || ["스토리", "플롯", "에피소드", "개연성", "서사"].some((t) => tags.has(t))) {
    domains.add("소설");
  }

  if (domains.size === 0) domains.add("세계관");
  return [...domains];
}

async function setup({ databaseId, parentPageId, apply }) {
  await getMe();
  const db = await getDatabase(databaseId);

  const existingProps = db.properties || {};
  const propertiesPatch = {};

  const ensureMultiSelect = (name, options) => {
    const existing = existingProps[name];
    if (existing) {
      if (existing.type !== "multi_select") {
        throw new Error(`DB에 이미 '${name}' 속성이 있는데 타입이 multi_select가 아닙니다: ${existing.type}`);
      }
      return;
    }
    propertiesPatch[name] = {
      multi_select: {
        options,
      },
    };
  };

  const ensureSelect = (name, options) => {
    const existing = existingProps[name];
    if (existing) {
      if (existing.type !== "select") {
        throw new Error(`DB에 이미 '${name}' 속성이 있는데 타입이 select가 아닙니다: ${existing.type}`);
      }
      return;
    }
    propertiesPatch[name] = {
      select: {
        options,
      },
    };
  };

  const ensureRelation = (name, targetDatabaseId) => {
    const existing = existingProps[name];
    if (existing) {
      if (existing.type !== "relation") {
        throw new Error(`DB에 이미 '${name}' 속성이 있는데 타입이 relation이 아닙니다: ${existing.type}`);
      }
      return;
    }
    propertiesPatch[name] = {
      relation: {
        database_id: normalizeNotionId(targetDatabaseId),
        single_property: {},
      },
    };
  };

  const ensureDate = (name) => {
    const existing = existingProps[name];
    if (existing) {
      if (existing.type !== "date") {
        throw new Error(`DB에 이미 '${name}' 속성이 있는데 타입이 date가 아닙니다: ${existing.type}`);
      }
      return;
    }
    propertiesPatch[name] = { date: {} };
  };

  const ensureRichText = (name) => {
    const existing = existingProps[name];
    if (existing) {
      if (existing.type !== "rich_text") {
        throw new Error(`DB에 이미 '${name}' 속성이 있는데 타입이 rich_text가 아닙니다: ${existing.type}`);
      }
      return;
    }
    propertiesPatch[name] = { rich_text: {} };
  };

  ensureMultiSelect("도메인", [
    { name: "세계관", color: "blue" },
    { name: "소설", color: "pink" },
    { name: "게임", color: "green" },
  ]);

  ensureSelect("대분류", [
    { name: "설정", color: "gray" },
    { name: "인물", color: "yellow" },
    { name: "세력", color: "red" },
    { name: "장소/지역", color: "brown" },
    { name: "역사/사건", color: "orange" },
    { name: "초법", color: "purple" },
    { name: "기술", color: "blue" },
    { name: "군사", color: "green" },
    { name: "용어/개념", color: "gray" },
    { name: "유물/아이템", color: "pink" },
    { name: "시스템(게임)", color: "green" },
    { name: "플롯/에피소드", color: "yellow" },
    { name: "메타", color: "gray" },
    { name: "기타", color: "gray" },
  ]);

  ensureRelation("관련 노드", databaseId);

  ensureSelect("상태", [
    { name: "초안", color: "gray" },
    { name: "정리중", color: "yellow" },
    { name: "확정", color: "green" },
  ]);

  // (선택) 1차 분류(존재/사건/구조/결과) + 미지정 해체용
  ensureSelect("역할", [
    { name: "존재", color: "yellow" },
    { name: "사건", color: "orange" },
    { name: "구조", color: "green" },
    { name: "결과", color: "red" },
    { name: "미지정_존재", color: "gray" },
    { name: "미지정_사건", color: "gray" },
    { name: "미지정_구조", color: "gray" },
    { name: "미지정_결과", color: "gray" },
  ]);

  // (선택) 모드 탭용 확장 속성들
  ensureSelect("레이어", [
    { name: "CORE", color: "gray" },
    { name: "SYSTEM", color: "green" },
    { name: "NARRATIVE", color: "yellow" },
    { name: "PLAYER", color: "blue" },
  ]);
  ensureMultiSelect("가시성", [
    { name: "PLAYER", color: "blue" },
    { name: "NPC", color: "yellow" },
    { name: "종언자", color: "purple" },
    { name: "CORE", color: "gray" },
  ]);
  ensureDate("시간");
  ensureRichText("시점");

  const patchKeys = Object.keys(propertiesPatch);
  if (patchKeys.length > 0) {
    console.log(`DB 속성 추가 예정: ${patchKeys.join(", ")}`);
    if (apply) {
      await patchDatabase(databaseId, { properties: propertiesPatch });
      console.log("DB 속성 추가 완료.");
    } else {
      console.log("(dry-run) --apply를 붙이면 실제로 반영합니다.");
    }
  } else {
    console.log("DB 속성: 이미 필요한 항목이 전부 존재합니다.");
  }

  console.log(`지도 페이지 생성(부모: ${normalizeNotionId(parentPageId)})`);
  if (!apply) {
    console.log("(dry-run) --apply를 붙이면 실제로 페이지를 생성합니다.");
    return;
  }

  const mapPage = await createPage({
    parent: { page_id: normalizeNotionId(parentPageId) },
    properties: {
      title: {
        title: [{ type: "text", text: { content: "테르미누스 지도" } }],
      },
    },
  });

  const mermaid = [
    "graph LR",
    "T[테르미누스]-->W[세계관]; T-->N[소설]; T-->G[게임]",
    "W-->S[설정]; W-->P[인물]; W-->F[세력]; W-->L[장소/지역]; W-->H[역사/사건]; W-->M[초법]; W-->K[기술]; W-->R[군사]; W-->V[용어/개념]; W-->A[유물/아이템]",
    "R-->C[병과]; R-->B[병기]; R-->O[편제/전술]",
    "N-->PL[플롯]; N-->TH[테마/개연성]; N-->CH[에피소드]",
    "G-->SYS[시스템]; G-->COM[전투]; G-->PRO[성장]; G-->ITM[장비/아이템]",
  ].join("\n");

  const children = [
    {
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text", text: { content: "테르미누스 지도" } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "DB의 속성/연결(관련 노드)을 채우면서 이 지도를 확장하세요.",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "code",
      code: {
        rich_text: [{ type: "text", text: { content: mermaid } }],
        language: "mermaid",
      },
    },
  ];

  try {
    await appendBlockChildren(mapPage.id, children);
    console.log(`지도 페이지 생성 완료: ${mapPage.url}`);
  } catch (e) {
    // Mermaid 언어가 API에서 거부될 수 있어서 fallback.
    console.warn(`Mermaid 블록 추가 실패(언어 제한 가능): ${String(e.message || e)}`);
    const fallbackChildren = children.map((b) =>
      b.type === "code"
        ? {
            ...b,
            code: {
              ...b.code,
              language: "plain text",
            },
          }
        : b,
    );
    await appendBlockChildren(mapPage.id, fallbackChildren);
    console.log(`지도 페이지 생성 완료(코드블록 언어=plain text): ${mapPage.url}`);
    console.log("노션에서 코드 블록 언어를 Mermaid로 바꾸면 렌더링됩니다.");
  }
}

async function normalizeRelated({ databaseId, apply }) {
  await getMe();
  const db = await getDatabase(databaseId);
  const relatedProp = db.properties?.["연관"];
  if (!relatedProp) throw new Error("DB에 '연관' 속성이 없습니다.");
  if (relatedProp.type !== "multi_select") {
    throw new Error(`'연관' 속성이 multi_select가 아닙니다: ${relatedProp.type}`);
  }

  let cursor = undefined;
  const updates = [];
  let total = 0;

  while (true) {
    const res = await queryDatabase(databaseId, {
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of res.results) {
      total++;
      const current = page.properties?.["연관"]?.multi_select || [];
      const names = current.map((o) => o.name);
      const next = uniq(names.flatMap((n) => (n.includes(",") ? splitCommaTag(n) : [n])));
      const changed =
        names.length !== next.length || names.some((n, idx) => n !== next[idx]);
      if (changed) {
        updates.push({ id: page.id, title: page.url, before: names, after: next });
      }
    }

    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  console.log(`총 ${total}개 중, '연관' 정규화 대상 ${updates.length}개`);
  if (updates.length === 0) return;

  // 요약(상위 30개만)
  const sample = updates.slice(0, 30);
  for (const u of sample) {
    console.log(`- ${u.id}: ${u.before.join(" | ")} -> ${u.after.join(" | ")}`);
  }
  if (updates.length > sample.length) console.log(`... (총 ${updates.length}개)`);

  if (!apply) {
    console.log("(dry-run) --apply를 붙이면 실제로 반영합니다.");
    return;
  }

  // Notion API 레이트리밋을 피하려고 천천히 처리합니다.
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    await patchPage(u.id, {
      properties: {
        연관: {
          multi_select: u.after.map((name) => ({ name })),
        },
      },
    });
    if ((i + 1) % 20 === 0) console.log(`진행: ${i + 1}/${updates.length}`);
    await sleep(350);
  }

  console.log("완료: '연관' 콤마 옵션을 분리해서 정규화했습니다.");
}

async function analyze({ databaseId }) {
  await getMe();

  const db = await getDatabase(databaseId);
  const titlePropName = findDatabaseTitlePropName(db);
  const totalProps = Object.keys(db.properties || {}).length;

  let cursor = undefined;
  let total = 0;
  let emptyRelated = 0;
  let hasCategory = 0;
  let hasDomain = 0;

  const relatedValues = [];

  while (true) {
    const res = await queryDatabase(databaseId, { page_size: 100, start_cursor: cursor });
    for (const page of res.results) {
      total++;
      const related = page.properties?.["연관"]?.multi_select?.map((o) => o.name) || [];
      if (related.length === 0) emptyRelated++;
      else relatedValues.push(...related);

      if (page.properties?.["대분류"]?.select?.name) hasCategory++;
      if ((page.properties?.["도메인"]?.multi_select || []).length > 0) hasDomain++;
    }
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  const counts = countBy(relatedValues);
  const top = topNFromCountMap(counts, 30);

  const dbTitle = (db.title || []).map((t) => t.plain_text).join("");
  console.log(`DB: ${dbTitle} (${normalizeNotionId(databaseId)})`);
  console.log(`- titleProp: ${titlePropName}`);
  console.log(`- properties: ${totalProps}`);
  console.log(`- pages: ${total}`);
  console.log(`- 연관 비어있음: ${emptyRelated}`);
  console.log(`- 대분류 채움: ${hasCategory}`);
  console.log(`- 도메인 채움: ${hasDomain}`);
  console.log(`- 연관 옵션 종류 수: ${counts.size}`);

  console.log("\n[연관] 상위 30개");
  for (const [name, c] of top) console.log(`- ${name}: ${c}`);
}

async function autoclassify({ databaseId, apply, limit, force }) {
  await getMe();

  const db = await getDatabase(databaseId);
  const titlePropName = findDatabaseTitlePropName(db);

  let cursor = undefined;
  const updates = [];
  const categoryCounts = new Map();

  while (true) {
    const res = await queryDatabase(databaseId, { page_size: 100, start_cursor: cursor });
    for (const page of res.results) {
      const related = page.properties?.["연관"]?.multi_select?.map((o) => o.name) || [];
      if (related.length === 0) continue;

      const currentCategory = page.properties?.["대분류"]?.select?.name || null;
      const currentDomains = (page.properties?.["도메인"]?.multi_select || []).map((o) => o.name);

      const nextCategory = inferCategoryFromRelated(related);
      if (!nextCategory) continue;

      const nextDomains = inferDomains(nextCategory, related);

      const patch = { properties: {} };
      if (force || !currentCategory) {
        patch.properties["대분류"] = { select: { name: nextCategory } };
      }
      if (force || currentDomains.length === 0) {
        patch.properties["도메인"] = { multi_select: nextDomains.map((name) => ({ name })) };
      }

      if (Object.keys(patch.properties).length === 0) continue;

      const title = getTitleFromDatabasePage(page, titlePropName);
      updates.push({ id: page.id, title, related, patch, nextCategory, nextDomains });
      categoryCounts.set(nextCategory, (categoryCounts.get(nextCategory) || 0) + 1);

      if (limit && updates.length >= limit) break;
    }
    if (limit && updates.length >= limit) break;
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  console.log(`대상 업데이트: ${updates.length}${limit ? ` (limit=${limit})` : ""}`);
  console.log("\n[대분류] 업데이트 분포");
  for (const [name, c] of [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${name}: ${c}`);
  }

  const sample = updates.slice(0, 20);
  if (sample.length > 0) {
    console.log("\n샘플(최대 20개)");
    for (const u of sample) {
      const rel = u.related.join(", ");
      console.log(`- ${u.title || u.id}: 연관=[${rel}] -> 대분류=${u.nextCategory}, 도메인=[${u.nextDomains.join(", ")}]`);
    }
  }

  if (!apply) {
    console.log("\n(dry-run) --apply를 붙이면 실제로 반영합니다.");
    return;
  }

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await patchPage(u.id, u.patch);
        break;
      } catch (e) {
        if (attempt === 5) throw e;
        await sleep(Math.min(5000, 350 * attempt * attempt));
      }
    }
    if ((i + 1) % 50 === 0) console.log(`진행: ${i + 1}/${updates.length}`);
    await sleep(50);
  }
  console.log("완료: 대분류/도메인 자동 분류를 반영했습니다.");
}

async function autorole({ databaseId, apply, limit, force, strict }) {
  await getMe();

  const db = await getDatabase(databaseId);
  const titlePropName = findDatabaseTitlePropName(db);

  let cursor = undefined;
  const updates = [];
  const roleCounts = new Map();

  while (true) {
    const res = await queryDatabase(databaseId, { page_size: 100, start_cursor: cursor });
    for (const page of res.results) {
      const currentRole = getSelectName(page, "역할");
      if (currentRole && !force) continue;

      const related = page.properties?.["연관"]?.multi_select?.map((o) => o.name) || [];
      const category = getSelectName(page, "대분류") || inferCategoryFromRelated(related) || "기타";

      const nextRole = inferRole({ category, related, strict });
      if (!nextRole) continue;

      const title = getTitleFromDatabasePage(page, titlePropName);
      updates.push({
        id: page.id,
        title,
        category,
        related,
        before: currentRole || null,
        after: nextRole,
      });

      roleCounts.set(nextRole, (roleCounts.get(nextRole) || 0) + 1);
      if (limit && updates.length >= limit) break;
    }
    if (limit && updates.length >= limit) break;
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  console.log(`대상 업데이트(역할): ${updates.length}${limit ? ` (limit=${limit})` : ""}`);
  console.log("\n[역할] 업데이트 분포");
  for (const [name, c] of [...roleCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${name}: ${c}`);
  }

  const sample = updates.slice(0, 25);
  if (sample.length > 0) {
    console.log("\n샘플(최대 25개)");
    for (const u of sample) {
      const rel = u.related.slice(0, 12).join(", ");
      console.log(
        `- ${u.title || u.id}: 대분류=${u.category} | 역할 ${u.before || "(없음)"} -> ${u.after} | 연관=[${
          rel
        }${u.related.length > 12 ? ", ..." : ""}]`,
      );
    }
  }

  if (!apply) {
    console.log("\n(dry-run) --apply를 붙이면 실제로 반영합니다.");
    return;
  }

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const patch = { properties: { 역할: { select: { name: u.after } } } };
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await patchPage(u.id, patch);
        break;
      } catch (e) {
        if (attempt === 5) throw e;
        await sleep(Math.min(5000, 350 * attempt * attempt));
      }
    }
    if ((i + 1) % 50 === 0) console.log(`진행: ${i + 1}/${updates.length}`);
    await sleep(350);
  }

  console.log("완료: 역할 자동 분류를 반영했습니다.");
}

async function exportGraph({ databaseId, outPath }) {
  await getMe();

  const db = await getDatabase(databaseId);
  const titlePropName = findDatabaseTitlePropName(db);

  // 뷰어/분류(역할)용 속성은 export 단계에서 "최소한" 자동 보장합니다.
  // - 데이터 자체를 바꾸지 않고, 속성(컬럼)만 추가하는 안전한 작업입니다.
  try {
    const existing = db.properties?.["역할"];
    if (!existing) {
      console.log("DB에 '역할' 속성이 없어 자동으로 추가합니다.");
      await patchDatabase(databaseId, {
        properties: {
          역할: {
            select: {
              options: [
                { name: "존재", color: "yellow" },
                { name: "사건", color: "orange" },
                { name: "구조", color: "green" },
                { name: "결과", color: "red" },
                { name: "미지정_존재", color: "gray" },
                { name: "미지정_사건", color: "gray" },
                { name: "미지정_구조", color: "gray" },
                { name: "미지정_결과", color: "gray" },
              ],
            },
          },
        },
      });
      console.log("DB '역할' 속성 추가 완료.");
    } else if (existing.type !== "select") {
      console.log(`경고: DB '역할' 속성이 있지만 타입이 select가 아닙니다: ${existing.type}`);
    }
  } catch (e) {
    console.log(`경고: DB '역할' 속성을 자동 추가하지 못했습니다. (${String((e && e.message) || e)})`);
  }

  let cursor = undefined;
  const pages = [];
  while (true) {
    const res = await queryDatabase(databaseId, { page_size: 100, start_cursor: cursor });
    pages.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  const ROOT_ID = "__terminus_root__";
  const DOMAIN_IDS = new Map([
    ["세계관", "__domain_world__"],
    ["소설", "__domain_novel__"],
    ["게임", "__domain_game__"],
  ]);

  /** @type {Array<any>} */
  const nodes = [];
  /** @type {Array<any>} */
  const links = [];

  nodes.push({ id: ROOT_ID, type: "root", label: "테르미누스" });
  for (const [domainName, id] of DOMAIN_IDS.entries()) {
    nodes.push({ id, type: "domain", label: domainName, domain: domainName });
    links.push({ source: ROOT_ID, target: id, type: "hierarchy" });
  }

  const categoryNodeIdByKey = new Map();
  const seenLink = new Set();

  const addLink = (source, target, type) => {
    const isUndirected = type === "relation" || String(type || "").startsWith("rel_");
    const key = isUndirected
      ? [source, target].sort().join("|") + `|${type}`
      : `${source}|${target}|${type}`;
    if (seenLink.has(key)) return;
    seenLink.add(key);
    links.push({ source, target, type });
  };

  const seenItem = new Set();
  const itemById = new Map();
  for (const page of pages) {
    const id = page.id;
    const title = getTitleFromDatabasePage(page, titlePropName).trim();
    if (!title) continue;

    const relatedTags = getMultiSelectNames(page, "연관");
    const category =
      page.properties?.["대분류"]?.select?.name ||
      inferCategoryFromRelated(relatedTags) ||
      "기타";
    const domains =
      getMultiSelectNames(page, "도메인") || [];
    const inferredDomains = domains.length > 0 ? domains : inferDomains(category, relatedTags);
    const status = getSelectName(page, "상태");
    const relatedNodes = (page.properties?.["관련 노드"]?.relation || []).map((r) => r.id);

    const role = getSelectName(page, "역할");
    const layer = getSelectName(page, "레이어");

    const visibilityFromVisibility = getMultiSelectNames(page, "가시성");
    const visibilityFromObserver = getMultiSelectNames(page, "관측자");
    const visibilityFromSelect = getSelectName(page, "가시성");
    const visibility =
      visibilityFromVisibility.length > 0
        ? visibilityFromVisibility
        : visibilityFromObserver.length > 0
          ? visibilityFromObserver
          : visibilityFromSelect
            ? [visibilityFromSelect]
            : [];

    const time = getDateStart(page, "시간") || getDateStart(page, "날짜") || null;
    const timeLabel =
      getSelectName(page, "시점") ||
      getRichTextPlain(page, "시점") ||
      getRichTextPlain(page, "타임라인") ||
      "";

    if (!seenItem.has(id)) {
      const itemNode = {
        id,
        type: "item",
        label: title,
        url: page.url,
        category,
        domains: inferredDomains,
        tags: relatedTags,
        status,
        role,
        layer,
        visibility: visibility.filter(Boolean),
        time,
        timeLabel: timeLabel.trim() || null,
      };
      nodes.push(itemNode);
      itemById.set(String(id), itemNode);
      seenItem.add(id);
    }

    for (const d of inferredDomains) {
      const domainNodeId = DOMAIN_IDS.get(d) || DOMAIN_IDS.get("세계관");
      if (!domainNodeId) continue;
      const catKey = `${d}::${category}`;
      let catNodeId = categoryNodeIdByKey.get(catKey);
      if (!catNodeId) {
        catNodeId = `__cat__${d}__${category}`;
        categoryNodeIdByKey.set(catKey, catNodeId);
        nodes.push({ id: catNodeId, type: "category", label: category, domain: d });
        addLink(domainNodeId, catNodeId, "hierarchy");
      }
      addLink(catNodeId, id, "hierarchy");
    }

    for (const rid of relatedNodes) {
      addLink(id, rid, "relation");
    }
  }

  // (추정 관계) "연관" 태그 기반으로 item-item 관계를 생성합니다.
  // - 노션의 '관련 노드'를 적극적으로 쓰기 전까지, 관계를 "보이게" 만드는 보조 장치입니다.
  // - 너무 흔한 태그는 노이즈가 커서 제외합니다.
  const itemNodes = [...itemById.values()];
  const tagToItemIds = new Map();
  for (const it of itemNodes) {
    const tags = Array.isArray(it.tags) ? it.tags : [];
    for (const t of tags) {
      const tag = String(t || "").trim();
      if (!tag) continue;
      if (!tagToItemIds.has(tag)) tagToItemIds.set(tag, []);
      tagToItemIds.get(tag).push(String(it.id));
    }
  }

  const MAX_TAG_FREQ = 120;
  const TOP_K = 6;
  const MIN_SCORE = 0.18;

  for (const it of itemNodes) {
    const tags = Array.isArray(it.tags) ? it.tags : [];
    if (tags.length === 0) continue;

    const scores = new Map(); // otherId -> baseScore
    for (const rawTag of tags) {
      const tag = String(rawTag || "").trim();
      if (!tag) continue;
      const list = tagToItemIds.get(tag) || [];
      const freq = list.length;
      if (freq <= 1) continue;
      if (freq > MAX_TAG_FREQ) continue;

      const weight = 1 / Math.log(2 + freq); // 흔할수록 약해짐
      for (const otherId of list) {
        if (String(otherId) === String(it.id)) continue;
        scores.set(otherId, (scores.get(otherId) || 0) + weight);
      }
    }

    if (scores.size === 0) continue;

    const candidates = [];
    for (const [otherId, base] of scores.entries()) {
      const other = itemById.get(String(otherId));
      if (!other) continue;

      let score = base;
      if (String(other.category || "") === String(it.category || "")) score += 0.08;
      const d1 = Array.isArray(it.domains) ? it.domains : [];
      const d2 = Array.isArray(other.domains) ? other.domains : [];
      if (d1.some((d) => d2.includes(d))) score += 0.06;

      candidates.push({ otherId: String(otherId), score });
    }

    candidates.sort((a, b) => b.score - a.score);
    const picked = candidates.filter((c) => c.score >= MIN_SCORE).slice(0, TOP_K);
    for (const p of picked) addLink(String(it.id), p.otherId, "rel_inferred");
  }

  const payload = {
    meta: {
      exportedAt: formatKstIsoWithOffset(new Date()),
      exportedAtUtc: new Date().toISOString(),
      databaseId: normalizeNotionId(databaseId),
      titlePropName,
      totalPagesFetched: pages.length,
    },
    nodes,
    links,
  };

  ensureDirForFile(outPath);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`그래프 내보내기 완료: ${outPath}`);
  console.log(`- nodes=${nodes.length}, links=${links.length}`);
}

async function main() {
  loadEnvLocal();
  const { cmd, flags } = parseArgs(process.argv);

  if (!cmd || cmd === "--help" || cmd === "help") {
    usage();
    process.exit(cmd ? 0 : 1);
  }

  const apply = Boolean(flags.get("apply"));
  const limit = flags.get("limit") ? Number(flags.get("limit")) : undefined;
  const force = Boolean(flags.get("force"));
  const strict = Boolean(flags.get("strict"));
  const outPath = flags.get("out") || "public/terminus-graph.json";
  const databaseId = flags.get("database") || process.env.NOTION_DATABASE_ID || DEFAULT_DATABASE_ID;
  const parentPageId = flags.get("parent") || process.env.NOTION_PARENT_PAGE_ID || DEFAULT_PARENT_PAGE_ID;

  try {
    if (cmd === "setup") {
      await setup({ databaseId, parentPageId, apply });
      return;
    }
    if (cmd === "normalize-related") {
      await normalizeRelated({ databaseId, apply });
      return;
    }
    if (cmd === "analyze") {
      await analyze({ databaseId });
      return;
    }
    if (cmd === "autoclassify") {
      await autoclassify({ databaseId, apply, limit, force });
      return;
    }
    if (cmd === "autorole") {
      await autorole({ databaseId, apply, limit, force, strict });
      return;
    }
    if (cmd === "export-graph") {
      await exportGraph({ databaseId, outPath });
      return;
    }
    usage();
    process.exit(1);
  } catch (e) {
    console.error(String(e?.message || e));
    process.exit(1);
  }
}

await main();
