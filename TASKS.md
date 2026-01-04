# TASKS — “노션에서 그냥 보기”까지 (클릭 위주)

## A. 초기 1회 세팅(웹에서 클릭만)
1) **Notion Integration 만들기**
   - Notion → `Settings` → `Connections`(또는 Integrations) → 새 Integration 생성
   - 토큰(`secret_...` 또는 `ntn_...`) 복사
2) **Notion에서 DB/페이지를 Integration에 연결**
   - “총정리” DB 페이지 → `Share` → Integration 추가(Connections)
   - “테르미누스” 상위 페이지도 동일하게 Share(필요 시)
3) **GitHub Secret 등록**
   - GitHub repo → `Settings` → `Secrets and variables` → `Actions`
   - `New repository secret`
   - Name: `NOTION_TOKEN` / Value: 위 토큰
   - (선택) 기본 DB/부모 페이지를 바꿨다면 `NOTION_DATABASE_ID`, `NOTION_PARENT_PAGE_ID`도 추가
4) **GitHub Pages 활성화**
   - `Settings` → `Pages` → `Build and deployment`를 `GitHub Actions`로 설정
5) **Actions 수동 실행(딱 1번)**
   - `Actions` 탭 → `Terminus Pages` → 오른쪽 `Run workflow` 실행
6) **노션에 임베드**
   - 노션 페이지에 `Embed` 블록 추가 → Pages URL 붙여넣기
   - URL 예: `https://haedavja.github.io/hahahahgo/`

## B. 일상 운영(노션만)
- Notion “총정리” DB에서 항목 추가/수정
- 항목 간 연결은 `관련 노드`로만 추가
- 태그는 `연관`, 분류는 `대분류`, 범위는 `도메인`, 진행은 `상태`로 관리
- 업데이트는:
  - 자동(스케줄) 또는
  - GitHub `Actions → Terminus Pages → Run workflow`로 즉시 반영

