---
layout: home

hero:
  name: "하하하GO"
  text: "턴제 전략 카드 게임"
  tagline: 포커 조합 기반 전략적 전투 시스템
  actions:
    - theme: brand
      text: 시작하기
      link: /guide/
    - theme: alt
      text: 시스템 문서
      link: /systems/

features:
  - title: 전투 시스템
    details: 타임라인 기반 턴제 전투. 카드 선택, 대응, 진행의 3단계 구조.
  - title: 성장 시스템
    details: 에토스/파토스/로고스 피라미드 구조의 캐릭터 성장.
  - title: 던전 탐험
    details: 그래프 기반 탐험 시스템. 다양한 이벤트와 선택지.
  - title: 상징 시스템
    details: 게임 방향성을 결정짓는 상징(Relic) 수집과 시너지.
---

## 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 테스트 실행
npm test

# Storybook 실행
npm run storybook
```

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Zustand** - 상태 관리
- **Vite** - 빌드 도구
- **Vitest** - 테스트 프레임워크
- **Storybook** - 컴포넌트 문서화
- **Playwright** - E2E 테스트
