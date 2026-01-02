## 2025-11-14 개발 로그

### 오늘 작업
- `public/battle.html`을 실행 가능한 최신 산출물에서 복사해 와서 Vite/React 프로젝트에 편입.
- `LegacyBattleScreen`을 iframe 기반으로 교체하여 맵 화면에서 전투 화면으로 진입할 수 있도록 상태(store)를 조정.
- 전투 종료 시 `resolveBattle()`가 호출되도록 `postMessage` 루프를 안정화.

### 발생했던 문제 & 조치
1. **battle.html 문자 깨짐**  
   - 한글이 깨진 상태로 수정된 배포본을 직접 편집하면서 문자열 일부가 망가져 Babel 파싱 오류가 발생(`const who` 구문 깨짐).  
   - **조치**: 다시 실행 가능한 백업본으로 복사하고, 필요한 추가 기능은 이후 단계에서 안전하게 반영하도록 결정.

2. **전투 결과 모달 JSON 출력 오류**  
   - `lastBattleResult.log`가 객체인 채로 렌더되어 React가 “objects are not valid children” 오류를 발생.  
   - **조치**: `MapDemo`에 `formatBattleLogEntry` 헬퍼를 추가해 객체를 사람이 읽을 수 있는 문자열로 변환 후 표시.

3. **전투-맵 데이터 공유/조합 표기 작업 중단**  
   - 진행 중 복잡도가 커져 전투가 깨졌고, 최종적으로 battle.html을 정상 복구한 뒤 추후 계획에서 다시 다루기로 결정.

### 현재 상태
- `public/battle.html`은 최신 백업본과 동일하며 전투는 iframe에서 정상 진행.
- 맵 ↔ 전투 전환, 전투 결과 모달, 자원/카드 선택 등 기존 기능은 정상 유지.
- 추후 작업은 battle.html 커스터마이징보다 새 시스템에 도입하기 위한 참고 자료로 유지.

---

## 2025-11-15 개발 로그

### 오늘 진행
- `public/battle-legacy.html`을 참고 전용으로 남기고, 신규 전투 화면을 `src/components/battle/LegacyBattleApp.jsx`로 완전히 이관.
- `LegacyBattleApp` 안에 타임라인, 카드 선택/정렬, 콤보·에테르 계산, 적 AI(`decideEnemyMode`/`generateEnemyActions`), 로그/resolve UI 구현.
- Vite + React + Phaser 프로젝트 구조(`package.json`, `vite.config.js`, `src/`, `public/`) 정리 및 Babel/postMessage 런타임 제거.
- 주요 문서(`Implementation_Plan.md`, `tech-stack.md`, `game-progress-md.md`)를 React-first 전략에 맞게 갱신 시작.

### 새로 발견한 이슈
1. **`npm run build` 실패 (코드 -1073740791)**  
   - `vite build`가 `transforming... ✓ 44 modules transformed.` 이후 Windows 종료 코드 -1073740791로 실패. 추가 로그가 없어 `--debug`, 환경 변수 점검 필요.
2. **Phaser 연출 미연동**  
   - 현재 전투 화면은 전부 React DOM으로 표현. Phaser Scene/VFX를 붙일 샌드박스(`legacy/` 폴더) 작업 필요.
3. **테스트 미도입**  
   - Ether/콤보/AI 유틸이 순수 함수임에도 테스트가 없어 회귀에 취약. Vitest + React Testing Library 도입 예정.

### 다음 액션
- `npm run build --debug` 등으로 실패 지점을 좁히고 DEVLOG에 로그 축적.
- `onBattleResult` 콜백이 맵/메타 진행과 제대로 동작하는지 실제 맵 화면에서 검증.
- Ether/콤보 규칙 단위 테스트를 추가하고, Phaser 연출을 React UI에 단계적으로 결합.

---

## 2025-11-15 협업 인프라 구축 (Claude)

### 오늘 진행
- GPT Codex와 Claude 간 협업 워크플로우를 위한 문서화 및 도구 작성.
- `COLLABORATION-GUIDE.md`: 전체 협업 가이드 (프로젝트 구조, 작업 흐름, 브랜치 전략, 충돌 예방)
- `PROJECT-SNAPSHOT.md`: 현재 프로젝트 상태 스냅샷 (레포 정보, 실행 환경, 작업 상태, 핵심 시스템 사양)
- `sync-workspace.sh`: Linux/Mac용 Git 동기화 스크립트 (status/pull/push 자동화)
- `sync-workspace.bat`: Windows용 Git 동기화 스크립트

### 작성된 도구
1. **COLLABORATION-GUIDE.md** (8.5KB)
   - 프로젝트 구조 설명 (문서 레포 + 게임 코드 레포)
   - 4단계 작업 흐름 (동기화 → 작업 → 커밋/푸시 → 상태 공유)
   - 브랜치/태그 전략, 충돌 예방 가이드, 체크리스트 템플릿

2. **PROJECT-SNAPSHOT.md** (7.2KB)
   - 레포지토리 현재 상태 (브랜치, 커밋 해시, 파일 구조)
   - 실행 환경 & 명령어
   - 현재 작업 상태 (완료/진행중/다음 우선순위)
   - 에테르/콤보 시스템 사양 요약
   - 협업 프로토콜 & 주의사항

3. **sync-workspace.sh** (3.5KB)
   - 상태 확인: 두 레포의 브랜치/커밋/변경사항 표시
   - Pull: 최신 코드 받기 + npm install 자동 제안
   - Push: 변경사항 확인 → 커밋 메시지 입력 → 자동 푸시

4. **sync-workspace.bat** (5.1KB)
   - Windows용 동일 기능 제공
   - CMD 환경에서 동작하도록 배치 파일로 작성

### 현재 상태
- 모든 협업 도구가 `/home/user/hahahahgo`에 생성됨.
- `sync-workspace.sh`에 실행 권한 부여 완료 (`chmod +x`).
- 게임 코드 레포(`new/strategy-map`)는 아직 Claude 환경에 없음 (로컬 개발자가 푸시 예정).

### 사용 방법
```bash
# 상태 확인
./sync-workspace.sh status

# 최신 코드 받기
./sync-workspace.sh pull

# 변경사항 업로드
./sync-workspace.sh push
```

### 다음 액션
- 로컬 개발자가 `new/strategy-map`을 원격 레포에 푸시하면 Claude가 pull하여 동기화.
- GPT Codex에게 `COLLABORATION-GUIDE.md` 공유하여 동일한 워크플로우 적용.
- 실제 작업 시작 전 `PROJECT-SNAPSHOT.md`로 현재 상태 파악.
