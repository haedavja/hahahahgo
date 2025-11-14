# Tech Stack & Implementation Guide

## 1) 핵심 기술 선택 (2025-11-14 갱신)

| 구분 | 기술 | 설명 |
|------|------|------|
| **엔진** | 🔷 **Phaser 3** | 2D WebGL 전투/맵 구현 전용. React와 DOM 오버레이 형태로 공존. |
| **언어** | ✏️ **TypeScript** | 안전한 구조화 + Phaser/React 모두 지원. |
| **빌드/런타임** | ⚡ **Vite + React 18** | `strategy-map/` 폴더에 신규 프로젝트 생성 완료. `npm run dev/build` 기반. |
| **UI 프레임워크** | 🧩 **React DOM Overlay** | 카드 선택 UI, 로그, 던전 경고 모달 등을 컴포넌트로 관리. |
| **데이터/규칙** | 📄 **JSON/TS 모듈 + 추후 IndexedDB** | 카드·이벤트·속도규칙을 `src/data/*.ts`로 분리. 추후 캐시 계획. |
| **자원/에셋** | 🎨 **Kenney Assets + 커스텀 픽셀** | 초기 프로토타입은 Kenney, 이후 스타일 가이드 문서화 예정. |

비고: 기존 `통합 불완전 1.html` 자산은 참고용으로 남겨두고, React/Vite 구조로 단계적 이식.

---

## 2) 시스템별 기술 구조

| 시스템 | 사용 기술 | 구현 메모 |
|--------|-----------|-----------|
| **격자/타임라인** | Phaser Tilemap + React Overlay | Phaser 씬에서 위치·애니메이션 처리, React는 UI/선택을 담당. |
| **카드 & 속도 시스템** | TS 인터페이스 + 규칙 모듈 | `Card`, `SpeedRule`, `ActionQueue` 등 타입 정의. |
| **동시턴 처리** | Promise/async TurnManager | 입력 수집 → 큐 정렬 → 실행 → 로그 단계로 모듈화. |
| **AI/텔레그래프** | Phaser Graphics Overlay + 규칙 모듈 | 적 행동 예고 표시, 속도/우선순위 기반 판단. |
| **UI/로그** | React Components + Zustand(예정) | HUD, 던전 모달, 맵 노드, 카드 목록 등 상태 공유. |
| **테스트** | Vitest/Jest + React Testing Library | 규칙/큐 로직/컴포넌트 스냅샷 테스트 계획. |

---

## 3) 개발 단계 & 기술 조합

| 버전 | 주요 목표 | 현재 상태/계획 |
|------|-----------|----------------|
| **v0.1 (전투 루프 + 카드)** | 기본 동시턴 루프, 카드 입력 | Phaser + TS + Vite 골격. `strategy-map` 리포 생성. |
| **v0.2 (맵/AI + 던전 경고)** | React 맵 컴포넌트, 던전 경고 모달 | 기존 HTML/JSX를 React 모듈로 이전 중. |
| **v0.3 (원정 루프 + 보상)** | 덱 구성, 보상 선택 | 데이터 모듈화 + React Router 예정. |
| **v0.4 (VFX + 최적화)** | 사운드/파티클, 번들 최적화 | Vite 코드 스플리팅 + Phaser VFX. |

---

## 4) 대체/확장 옵션

| 목적 | 후보 기술 | 메모 |
|------|-----------|------|
| 모바일 네이티브 | Capacitor + Pixi/Phaser | 빌드 타깃 확대 시 고려. |
| 하드코어 3D | Godot 4 | 필요 시 전환 가능. |
| 실시간 멀티 | Colyseus + Node | 동시턴 멀티 실험용. |

---

## 5) 추천 워크플로우

1. `strategy-map/`에서 React + Phaser 컴포넌트 구조 유지.  
2. `src/data/`, `src/components/`, `src/phaser/`, `src/state/` 등 도메인별 모듈화.  
3. 문서(`Implementation_Plan.md`, `game-progress-md.md`, `통합규칙.md`)와 코드가 동기화되도록 규칙/데이터를 TS 모듈에서 import.  
4. `npm run dev`로 HMR 개발, `npm run build`로 배포용 번들 생성.

---

**작성일**: 2025-11-14  
**작성자**: Codex (Vite 리셋 반영)
