# 개발 진행 현황 (2025-11-15)

## 1. 현재 빌드/런타임 상태
- `new/strategy-map`는 **Vite + React + Phaser** 구조로 정리되었고, 전투 UI는 `src/components/battle/LegacyBattleApp.jsx` 하나로 렌더링된다.
- `npm run dev`는 정상적으로 실행되어 React 전투 화면을 확인할 수 있다.
- `npm run build`는 Vite가 `transforming... ✓ 44 modules transformed.` 이후 Windows 에러 **`-1073740791`** 로 종료된다. (추가 로그 없음 → 원인 조사 필요)
- `public/battle-legacy.html`은 Babel/postMessage 기반의 옛 전투 화면을 그대로 보관하며, 신규 기능은 모두 React 버전에만 추가한다.

## 2. 오늘 처리한 작업
| 구분 | 내용 |
|------|------|
| React 전투 리빌드 | `LegacyBattleApp.jsx`에 타임라인, 카드 선택/정렬, 콤보/에테르, 적 AI, 로그, 제출/해결 단계를 모두 통합. |
| Vite 프로젝트 구조화 | `package.json`, `vite.config.js`, `src` 폴더를 정비하고 Babel 런타임/iframe 의존성 제거. |
| 문서 싱크 | Implementation Plan, Tech Stack, Game Progress, DEVLOG가 React-first 전략을 기준으로 갱신되기 시작함. |

## 3. 신규 이슈 / 리스크
| 이슈 | 영향 | 조치 |
|------|------|------|
| `npm run build` 종료 코드 -1073740791 | 프로덕션 번들을 생성할 수 없음 | Windows에서 Vite가 종료되는 시점 파악 및 최소 재현 로그 확보 필요. |
| Phaser 연출 미연동 | 현재 화면이 React DOM만으로 구성됨 | Phaser 씬을 마운트하는 실험을 `legacy/` 디렉터리에서 진행 중. |
| 테스트 부재 | 규칙 함수 회귀를 잡기 어려움 | `detectPokerCombo`, `applyPokerBonus`, `generateEnemyActions` 등에 Vitest 도입 예정. |

## 4. 다음 우선순위 제안
1. `npm run build` 실패 로그를 더 확보하고 원인을 DEVLOG에 정리. (의심: Windows 권한/Phaser import/이미지 경로)
2. 맵 ↔ 전투 흐름 (onBattleResult) 을 실제 라우팅/씬에서 검증하여 post-combat 선택지를 노출.
3. Ether/콤보 규칙 테스트를 작성해 추후 밸런스 변경 시 회귀를 방지.
4. Phaser 연출을 React Battle UI 옆에서 점진적으로 붙이되, legacy HTML은 참조 용도로만 유지.
