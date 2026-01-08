# 설치

## 요구 사항

- Node.js 20+
- npm 9+

## 프로젝트 클론

```bash
git clone https://github.com/haedavja/hahahahgo.git
cd hahahahgo
```

## 의존성 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 사용 가능한 스크립트

| 스크립트 | 설명 |
|---------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | 단위 테스트 실행 |
| `npm run test:coverage` | 커버리지 리포트 생성 |
| `npm run test:e2e` | E2E 테스트 실행 |
| `npm run storybook` | Storybook 실행 |
| `npm run lint` | ESLint 검사 |

## Playwright 설정 (E2E 테스트)

```bash
npx playwright install
```

## 문제 해결

### peer dependency 경고

Storybook 관련 경고는 무시해도 됩니다:

```bash
npm install --legacy-peer-deps
```

### 포트 충돌

기본 포트(5173)가 사용 중이면 자동으로 다른 포트를 사용합니다.
