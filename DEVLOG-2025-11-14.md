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
