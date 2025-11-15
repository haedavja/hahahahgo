# Legacy Battle Integration

전투 화면은 이제 `LegacyBattleApp` 컴포넌트로 React 트리 안에서 직접 렌더됩니다. iframe 이나 `public/battle.html` 의 Babel 스크립트에 의존하지 않으므로 `postMessage` 통신 문제 없이 곧바로 맵 상태를 공유할 수 있습니다.

## 주요 위치

- `src/components/battle/LegacyBattleApp.jsx` – 기존 battle.html 스크립트를 모듈화한 컴포넌트입니다. Tailwind CDN 로더와 커스텀 스타일(`legacy-battle.css`)을 내부에서 불러옵니다.
- `src/components/battle/LegacyBattleScreen.jsx` – zustand 스토어의 `activeBattle` 상태를 감지해 `LegacyBattleApp`을 렌더하고, `window.postMessage`를 통해 초기값/결과를 주고받습니다.
- `src/components/map/MapDemo.jsx` – 맵/자원 UI. `resources.aether`가 battle 컴포넌트와 동일한 저장소를 공유합니다.

## 동작 개요

1. 맵에서 전투가 시작되면 `LegacyBattleScreen`이 나타나며, `window.postMessage({ from: "host", type: "battleInit", … })`로 초기 플레이어/적/에테르 정보를 전송합니다.
2. `LegacyBattleApp`은 `from: "host"` 메시지를 수신해 전투 상태를 초기화하고, 준비 완료 시 `battleReady` 메시지를 돌려줍니다.
3. 전투 중 에테르가 변하면 내부 상태에 즉시 반영되며, 턴 종료 시 `battleResult` 메시지를 `from: "battle"`로 내보내 맵 상태(`resources`)가 업데이트됩니다.

## 개발 흐름

1. 전투 로직/UI 변경 시 `src/components/battle/LegacyBattleApp.jsx`와 `legacy-battle.css`만 수정하면 됩니다.
2. `npm run dev`로 Vite 개발 서버를 띄우고 `http://localhost:5173/`에서 바로 확인합니다. 더 이상 `public/battle.html` 동기화 과정이 필요 없습니다.
3. 필요 시 `LegacyBattleScreen`의 메시지 프로토콜(`battleReady`, `battleInit`, `battleResult`)만 유지하면 다른 서브시스템과 연동하기 쉽습니다.

## NPM Scripts

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
npm run preview  # 빌드 산출물 미리보기
```

테스트 코드를 추가하거나 Tailwind를 정식으로 도입하고 싶다면, `LegacyBattleApp`을 여러 작은 컴포넌트로 나누면서 점진적으로 개선해 주세요.
