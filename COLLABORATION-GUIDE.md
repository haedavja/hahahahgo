# GPT Codex & Claude 협업 가이드

## 프로젝트 구조

```
hahahahgo/                          (Git 저장소 #1: 문서/계획)
├── .git/
├── DEVLOG.md                       (일일 개발 로그)
├── Implementation_Plan.md          (구현 계획)
├── game-progress-md.md            (진행 현황)
├── 통합규칙.md                     (작업 규칙)
├── 에테르.md                       (에테르 시스템 사양)
└── COLLABORATION-GUIDE.md         (이 문서)

hahahahgo/new/strategy-map/        (Git 저장소 #2: 게임 코드)
├── .git/
├── package.json
├── vite.config.js
├── src/
│   ├── components/
│   │   └── battle/
│   │       └── LegacyBattleApp.jsx
│   ├── scenes/
│   └── stores/
├── public/
│   └── battle-legacy.html         (참고용 레거시)
└── dist/                          (빌드 출력)
```

## 현재 상태 스냅샷 (2025-11-15)

### 레포지토리 정보

| 레포 | 현재 브랜치 | 최신 커밋 | 상태 |
|------|------------|----------|------|
| hahahahgo | `claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7` | `656ad31` | 문서만 있음 |
| hahahahgo/new/strategy-map | `master` | (로컬에만 존재) | Vite 프로젝트 |

### 실행 환경

```bash
# 개발 서버 (정상 작동)
cd hahahahgo/new/strategy-map
npm install
npm run dev
# → http://localhost:5173

# 프로덕션 빌드 (현재 오류)
npm run build
# → 오류: 종료 코드 -1073740791
```

---

## 공통 작업 흐름

### 1단계: 작업 시작 전 동기화

```bash
# 루트 레포 동기화
cd hahahahgo
git status
git pull origin claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7

# 게임 코드 레포 동기화 (있는 경우)
cd new/strategy-map
git status
git pull origin master

# 의존성 업데이트
npm install
```

### 2단계: 작업 수행

**규칙 (통합규칙.md 기준):**
1. ✅ 기존 인터페이스는 **절대 임의로 변경하지 않음**
2. ✅ 각 시스템을 하나의 게임으로 **조립/통합**하는 것이 목표
3. ✅ 그래픽은 **통일된 형태** 유지 (위화감 없이)
4. ✅ 별도 지시 없으면 내부 디자인 **수정하지 않음**
5. ✅ 문제 발생 시 **원인 파악 → 수정 → 검증**

**작업 기록:**
- `DEVLOG.md`에 날짜별로 작업 내용 기록
- 문제/조치/현재상태 섹션 필수 작성

### 3단계: 커밋 & 푸시

```bash
# 변경사항 확인
git status
git diff

# 스테이징
git add .

# 커밋 (명확한 메시지)
git commit -m "feat: 에테르 인플레이션 로직 구현

- 에테르.md 사양에 따라 1칸당 50% 증가 구현
- calculateEtherCost() 함수 추가
- 테스트 케이스 10개 추가
"

# 푸시
git push origin claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7
# 또는
git push origin master
```

### 4단계: 상태 공유

**Claude에게 공유할 정보:**
```
현재 작업: [기능/버그 설명]
브랜치: claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7
최신 커밋: [해시] [메시지]
실행 명령: npm run dev
빌드 상태: ✅ 정상 / ⚠️ 오류 (설명)
다음 작업: [TODO 리스트]
```

**GPT Codex에게 공유할 정보:**
- 동일한 형식 사용
- DEVLOG.md 링크 공유
- 구체적인 파일 경로와 라인 번호 제공

---

## 버전 관리 전략

### 브랜치 전략

| 브랜치 | 용도 | 담당 |
|--------|------|------|
| `master` | 안정 버전 (strategy-map) | 수동 머지 |
| `claude/game-development-collab-*` | Claude 작업 브랜치 | Claude |
| `feature/*` | 새 기능 개발 | GPT Codex/사용자 |
| `bugfix/*` | 버그 수정 | 공통 |

### 태그 규칙

```bash
# 마일스톤 달성 시
git tag -a v0.1.0-alpha -m "전투 시스템 React 이관 완료"
git push origin v0.1.0-alpha

# 일일 스냅샷
git tag daily-2025-11-15-07:12
git push origin --tags
```

---

## 충돌 예방 가이드

### 동시 작업 방지

1. **작업 선언**: 작업 시작 전 채팅에 알림
   ```
   "[Claude] MapDemo.jsx 수정 시작 (전투 결과 모달)"
   ```

2. **작업 완료**: 즉시 푸시하고 알림
   ```
   "[Claude] MapDemo.jsx 완료 (커밋 abc1234)"
   ```

3. **작업 대기**: 다른 AI가 작업 중이면 대기
   ```
   "[Codex] 대기 중... (Claude가 LegacyBattleApp.jsx 작업 중)"
   ```

### 충돌 해결

```bash
# 최신 코드 받기
git pull origin master

# 충돌 확인
git status

# 수동 해결 후
git add [충돌파일]
git commit -m "merge: Resolve conflict in [파일명]"
git push
```

---

## 체크리스트 템플릿

### 새 기능 추가 시

- [ ] `DEVLOG.md`에 작업 시작 기록
- [ ] 기존 인터페이스 영향도 확인
- [ ] 구현 완료
- [ ] `npm run dev`로 동작 확인
- [ ] `npm run build` 테스트
- [ ] 테스트 코드 작성 (가능하면)
- [ ] 커밋 & 푸시
- [ ] `DEVLOG.md`에 작업 완료 & 이슈 기록

### 버그 수정 시

- [ ] 재현 방법 확인
- [ ] 원인 파악
- [ ] `DEVLOG.md`에 문제/조치 기록
- [ ] 수정 구현
- [ ] 동일 문제 재발 확인 (회귀 테스트)
- [ ] 커밋 & 푸시
- [ ] `DEVLOG.md`에 해결 기록

---

## 빠른 참조

### 현재 진행 이슈

| 이슈 | 우선순위 | 상태 | 담당 |
|------|---------|------|------|
| `npm run build` 실패 (-1073740791) | 🔴 High | 조사 중 | 미정 |
| Phaser 연출 미연동 | 🟡 Medium | 대기 | 미정 |
| 테스트 코드 부재 | 🟡 Medium | 계획 | 미정 |
| 맵↔전투 흐름 검증 | 🟢 Low | 대기 | 미정 |

### 주요 파일 위치

| 파일 | 경로 | 설명 |
|------|------|------|
| 전투 UI | `src/components/battle/LegacyBattleApp.jsx` | React 전투 화면 |
| 에테르 규칙 | `에테르.md` | 인플레이션 사양 |
| 개발 로그 | `DEVLOG.md` | 일일 작업 기록 |
| 빌드 설정 | `vite.config.js` | Vite 설정 |

### 유용한 명령어

```bash
# 커밋 히스토리 확인
git log --oneline --graph -10

# 현재 커밋 해시 확인
git rev-parse --short HEAD

# 파일별 변경 이력
git log --follow -- src/components/battle/LegacyBattleApp.jsx

# 특정 커밋으로 이동 (읽기 전용)
git checkout abc1234

# 원래 브랜치로 복귀
git checkout master
```

---

## 연락/협업 프로토콜

### 작업 요청 형식

```markdown
**담당**: [Claude/Codex]
**작업**: [간단한 설명]
**파일**: [대상 파일들]
**참고**: [관련 이슈/문서]
**우선순위**: [High/Medium/Low]
**예상 시간**: [시간]
```

### 작업 완료 보고

```markdown
**완료**: [작업 설명]
**커밋**: [해시] [메시지]
**변경 파일**: [파일 목록]
**테스트**: [검증 방법]
**다음 작업**: [연관 TODO]
```

---

## 버전 정보

- **문서 버전**: 1.0.0
- **작성일**: 2025-11-15
- **최종 수정**: 2025-11-15
- **다음 업데이트**: 프로젝트 구조 변경 시

---

## 참고 문서

- `통합규칙.md`: 작업 기본 원칙
- `에테르.md`: 에테르 시스템 사양
- `DEVLOG.md`: 일일 개발 로그
- `Implementation_Plan.md`: 전체 구현 계획
- `game-progress-md.md`: 진행 현황
