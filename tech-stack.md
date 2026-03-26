# Tech Stack & Implementation Guide

## 1) 핵심 기술 선택 (2025-11-15 갱신)

| 구분 | 기술 | 설명 |
|------|------|------|
| **런타임** | 🎮 **Phaser 3** + ⚛️ **React 18** | Phaser가 전투 연출·시간축을 담당하고, React가 HUD/카드/로그 등 DOM UI를 담당한다. |
| **언어** | 📜 **JavaScript (ES2023)** | `src/components/battle/LegacyBattleApp.jsx` 등 모든 전투 로직이 최신 ES+JSX로 작성되어 있다. |
| **빌드/번들** | ⚡ **Vite 7** | `npm run dev` HMR, `npm run build` 번들을 제공. Babel + postMessage 파이프라인은 제거됨. |
| **스타일/UI** | 🎨 **Tailwind-lite + 커스텀 CSS** | `legacy-battle.css` 유틸리티 클래스로 UI/타임라인/카드 스타일 구성. |
| **데이터 규칙** | 📁 **JS 모듈 (`battleData.js`)** | 카드/에테르/적 덱 데이터를 JS 모듈로 정의하고 React 훅에서 직접 소비. |
| **레거시 참고** | 🗂️ **`public/battle-legacy.html`** | Babel 기반 옛 전투 화면. 비교·회귀용 보존, 수정 대상 아님. |

> 메모: 기존 Babel/iframe 기반 런타임은 완전히 삭제되었으며, 모든 전투 경험이 React/Vite 앱 안에서 렌더링된다.

---

## 2) 서브시스템 구조

| 서브시스템 | 사용 기술 | 구현 메모 |
|------------|-----------|-----------|
| **전투 타임라인** | React DOM | `LegacyBattleApp`가 카드 순서를 계산하고 DOM 타임라인/미리보기를 렌더링. Phaser는 추후 연출 확장에만 사용. |
| **카드·콤보 규칙** | 순수 JS 유틸 | `detectPokerCombo`, `applyPokerBonus`, `ETHER_GAIN_MAP` 등 모듈 함수가 로직을 담당. |
| **적 AI** | React 훅 + 유틸 | `decideEnemyMode`와 `generateEnemyActions`가 성향/자원 제약을 계산하여 행동 큐 생성. |
| **상태 관리** | React state + `useMemo/useCallback` | 별도 전역 스토어 없이 Battle 컴포넌트 내부에서 상태를 캡슐화. |
| **빌드 스크립트** | `npm run dev`, `npm run build`, `npm run preview` | dev 서버는 정상, build는 현재 Windows 에러 `-1073740791`로 실패(조사 필요). |
| **테스트** | (미구현) Vitest 후보 | 순수 함수가 많으므로 Vitest + React Testing Library 도입 예정. |

---

## 3) 개발 로드맵 & 기술 조합

| 버전 | 주요 목표 | 현재 상태 / 다음 단계 |
|------|-----------|------------------------|
| **v0.1 (React 전투 UI)** | 타임라인, 카드 선택/제출, 로그 | ✅ `LegacyBattleApp.jsx` 구현 완료. 에테르/콤보/적 행동까지 React가 처리. |
| **v0.2 (맵 연동 & 보상)** | 맵 화면과 승패/보상, post-combat UI | 🔄 `onBattleResult` 콜백이 준비됨. 맵 씬과 통합 E2E 테스트 필요. |
| **v0.3 (연출 + 사운드)** | Phaser 연출, 사운드, 효과음 | ⏳ `legacy/` 샌드박스 코드와 통합 예정. |
| **v0.4 (테스트 & CI)** | Vitest, CI 빌드 안정화 | 🚧 `npm run build` 실패 원인 분석, 단위 테스트 도입. |

---

## 4) 확장 아이디어

| 목적 | 후보 기술 | 메모 |
|------|-----------|------|
| 데스크톱 패키징 | Electron + Vite | React/Phaser 조합 그대로 데스크톱 배포 가능. |
| 멀티플레이 실험 | Colyseus (Node) | 턴 로그 교환으로 비동기 PvP 구현 가능. |
| 저장/동기화 | IndexedDB + Cloud sync | 에테르, 덱, 적 진행도를 로컬·원격으로 저장. |

---

## 5) 권장 워크플로우
1. `cd new/strategy-map && npm install` – Vite/React/Phaser 의존성을 설치한다.  
2. `npm run dev` – `http://localhost:5173`에서 LegacyBattleApp UI를 확인하며 기능 개발.  
3. 전투 규칙/데이터를 수정할 때 `src/components/battle/LegacyBattleApp.jsx`와 `battleData.js`를 동시 갱신하고 문서(Implementation Plan, game-progress, DEVLOG)에 기록.  
4. `npm run build`로 번들을 확인하되, 현재 Windows 에러 `-1073740791`이 발생하므로 로그와 재현 조건을 DEVLOG에 남긴다.  
5. 레거시 비교가 필요하면 `public/battle-legacy.html`을 열어 스펙 차이를 확인하되, 수정은 금지한다.

---

**작성일**: 2025-11-15  
**작성자**: Codex (React/Vite 전환 반영)
