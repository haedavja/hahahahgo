# SPEC — TERMINUS (Notion → Graph JSON → GitHub Pages → Notion Embed)

## 목표
1) Notion DB(“총정리”)를 **단일 원본(SSOT)** 으로 유지한다.  
2) DB를 그래프용 JSON으로 내보내고, **GitHub Pages에 자동 배포**한다.  
3) 생성된 Pages URL을 **노션에 임베드**해서, 노션 웹에서 바로 그래프를 본다.

---

## 데이터 소스 (Notion)
### 대상 DB
- 기본 DB ID: `b67a8082-de7c-4bb2-a966-1fb333d9ed1c` (총정리)
- 기본 부모 페이지 ID: `09873372-f0c4-4259-b1ee-14be0d748884` (테르미누스)

### 필요한 DB 속성(이름/타입 고정)
아래 속성 **이름을 바꾸면 안 됨**.
- `도메인` (multi_select) 옵션: `세계관`, `소설`, `게임`
- `대분류` (select) 옵션:
  - `설정`, `인물`, `세력`, `장소/지역`, `역사/사건`, `초법`, `기술`, `군사`, `용어/개념`, `유물/아이템`,
  - `시스템(게임)`, `플롯/에피소드`, `메타`, `기타`
- `연관` (multi_select) : 태그
- `관련 노드` (relation → 같은 DB) : 항목 간 연결
- `상태` (select) 옵션: `초안`, `정리중`, `확정`

### Notion API 인증
- GitHub Actions secret: `NOTION_TOKEN` (필수)
- 선택 secret: `NOTION_DATABASE_ID`, `NOTION_PARENT_PAGE_ID` (기본값을 바꾸는 경우만)

---

## 내보내기 형식 (Graph JSON)
출력 파일: `terminus_pages/terminus-graph.json`

형식:
- `meta`
  - `exportedAt` (ISO string)
  - `databaseId` (정규화된 UUID)
  - `titlePropName`
  - `totalPagesFetched`
- `nodes[]`
  - `root` : `테르미누스`
  - `domain` : `세계관` / `소설` / `게임`
  - `category` : `(도메인, 대분류)` 조합 노드
  - `item` : DB의 각 페이지(항목)
    - `label`(제목), `url`, `category`(대분류), `domains`(도메인[]), `tags`(연관[]), `status`(상태)
- `links[]`
  - `hierarchy` : root→domain, domain→category, category→item
  - `relation` : item↔item (`관련 노드` 기반)

중복 규칙:
- hierarchy link는 방향성 유지
- relation link는 **중복 제거(무방향 취급)** 해서 1개만 남긴다

---

## 배포/호스팅 (GitHub Pages)
### 정적 뷰어
- 위치: `terminus_pages/index.html`
- 요구사항:
  - 같은 폴더의 `./terminus-graph.json`을 fetch해서 렌더링
  - 검색/필터(도메인)/항목 목록/관계선 토글/줌-투-핏 등 기본 탐색 UX 제공
  - 서버 없이 동작(정적 HTML)

### GitHub Actions
- 워크플로: `.github/workflows/terminus-pages.yml`
- 트리거:
  - `workflow_dispatch` (수동 실행)
  - `schedule` (정기 자동 실행)
  - `push` (관련 파일 변경 시)
- 동작:
  1) Node 설치
  2) `node scripts/notion-terminus.mjs export-graph --out terminus_pages/terminus-graph.json`
  3) Pages 배포

---

## 노션에서 보기 (Embed)
노션은 커스텀 JS를 직접 실행할 수 없으므로,
**GitHub Pages URL을 Embed 블록으로 붙여 넣는 방식**만 지원 범위로 한다.

