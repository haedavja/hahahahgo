# 세션 인계 문서

## 작업 규칙 (필수 준수)

### 1. 자동 버전 태그 갱신
- 파일: `/home/user/hahahahgo/src/components/map/MapDemo.jsx`
- 위치: line 108
- 현재: `const PATCH_VERSION_TAG = "11-17-10:00";`
- **모든 변경사항마다 KST 시간으로 자동 갱신** (형식: "MM-DD-HH:MM")

### 2. Git 자동화 (매우 중요!)
- **현재 브랜치**: `claude/game-dev-agent-017C2cnFJNJCQYtZbjfPkpkx`
- **브랜치 이름 규칙**: 반드시 `claude/` + 현재 세션 ID로 끝나야 함
- **⚠️ 403 에러 방지**: 세션 ID와 일치하지 않는 브랜치로 푸시 시도 시 에러 발생

작업 완료 시 자동 커밋 & 푸시:
```bash
git add -A && git commit -m "feat: 설명" && git push -u origin claude/game-dev-agent-017C2cnFJNJCQYtZbjfPkpkx
```

**403 에러 발생 시**:
1. 브랜치 이름 확인: `git branch`
2. 세션 ID가 `017C2cnFJNJCQYtZbjfPkpkx`인지 확인
3. 다르면 올바른 브랜치로 체크아웃 또는 생성

### 3. 작업 방식
- 사용자가 지시한 정확한 수치(px, %, rem 등) 준수
- 복잡한 작업은 TodoWrite 도구로 관리
- 사용자가 지시한 요소가 무엇인지 정확히 확인

---

## 현재 코드 상태 (v11-17-10:00)

### 전역 체력 시스템
**파일**: `/home/user/hahahahgo/src/state/useGameState.js`
```javascript
// Lines 126-140
export const createInitialState = () => ({
  map: generateMap(),
  mapRisk: Math.floor(Math.random() * 61) + 20,
  resources: { gold: 40, intel: 2, loot: 1, material: 1, etherPts: 0 },
  playerHp: 100,  // 전역 플레이어 HP
  maxHp: 100,     // 최대 HP
  activeEvent: null,
  activeDungeon: null,
  activeBattle: null,
  lastBattleResult: null,
  characterBuild: {
    mainSpecials: [],
    subSpecials: [],
  },
});
```

**파일**: `/home/user/hahahahgo/src/state/gameStore.js`
- `resolveBattle`: 전투 종료 시 finalState의 HP를 playerHp에 저장 (lines 523-539)
- `computeBattlePlan`: 현재 HP를 매개변수로 받아 전투 시뮬레이션에 반영 (lines 109-125)
- `startBattle`: enemyHp 매개변수 추가, 현재 playerHp 사용 (lines 462-521)
- `travelToNode`: createBattlePayload에 playerHp 전달 (line 198)

### 카드 데이터
**파일**: `/home/user/hahahahgo/src/components/battle/battleData.js`
```javascript
// Lines 6-17 - Parry 카드의 counter 속성 제거됨
export const CARDS = [
  { id: "quick",   name: "Quick Slash",    type: "attack",  damage: 13,              speedCost: 3,  actionCost: 1, iconKey: "sword" },
  { id: "slash",   name: "Slash",          type: "attack",  damage: 30,              speedCost: 5,  actionCost: 2, iconKey: "sword" },
  { id: "heavy",   name: "Heavy Strike",   type: "attack",  damage: 40,              speedCost: 10, actionCost: 2, iconKey: "flame" },
  { id: "double",  name: "Double Slash",   type: "attack",  damage: 17, hits: 2,     speedCost: 7,  actionCost: 2, iconKey: "sword" },
  { id: "precise", name: "Precise Strike", type: "attack",  damage: 32,              speedCost: 6,  actionCost: 2, iconKey: "sword" },
  { id: "rush",    name: "Rush Attack",    type: "attack",  damage: 14,              speedCost: 4,  actionCost: 1, iconKey: "flame" },
  { id: "parry",   name: "Parry",          type: "defense", block: 12,               speedCost: 2,  actionCost: 1, iconKey: "shield" },  // counter 제거
  { id: "guard",   name: "Guard",          type: "defense", block: 16,               speedCost: 6,  actionCost: 1, iconKey: "shield" },
  { id: "wall",    name: "Iron Wall",      type: "defense", block: 38,               speedCost: 9,  actionCost: 2, iconKey: "shield" },
  { id: "counter", name: "Counter Stance", type: "defense", block: 14, counter: 3,   speedCost: 4,  actionCost: 1, iconKey: "shield" },
];

// 카드 데미지 공식: actionCost * 10 * (1 + speedCost * 0.1)
```

### 전투창 카드 색상
**파일**: `/home/user/hahahahgo/src/components/battle/LegacyBattleApp.jsx`
- Select 단계 (lines 1295-1302): characterBuild 기반 행동력 색상 구분
- Respond 단계 (lines 1329-1336): characterBuild 기반 행동력 색상 구분
- Resolve 단계 (lines 1389-1396): characterBuild 기반 행동력 색상 구분

```javascript
// 색상 구분 로직
const currentBuild = useGameStore.getState().characterBuild;
const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
const costColor = isMainSpecial ? '#3b82f6' : isSubSpecial ? '#7dd3fc' : '#fff';

// 적용
<div className="card-cost-corner" style={{color: costColor}}>{c.actionCost}</div>
```

### 캐릭터 창
**파일**: `/home/user/hahahahgo/src/components/character/CharacterSheet.jsx`
- 크기: 640px → 960px (1.5배 확대, line 134)
- 전역 HP 상태 사용 (lines 19-23)

```javascript
const playerHp = useGameStore((state) => state.playerHp);
const maxHp = useGameStore((state) => state.maxHp);
const currentHp = playerHp;
```

### 맵 화면
**파일**: `/home/user/hahahahgo/src/components/map/MapDemo.jsx`
- HP 표시: resource-hud 최상단에 추가 (lines 270-272)
- 던전 전투 중 DungeonExploration 언마운트 방지 (line 413)
- 던전 전투 결과 모달 필터링 (line 415)

```javascript
// Line 270-272 - HP 표시
<span className="resource-tag" style={{ color: "#fca5a5", fontWeight: "700" }}>
  HP: {playerHp} / {maxHp}
</span>

// Line 413 - 전투 중 던전 숨김
{activeDungeon && activeDungeon.confirmed && !activeBattle && <DungeonExploration key={activeDungeon.nodeId} />}

// Line 415 - 던전 전투 결과 필터링
{lastBattleResult && !lastBattleResult.nodeId.startsWith('dungeon-') && (
```

### 던전 화면
**파일**: `/home/user/hahahahgo/src/components/dungeon/DungeonExploration.jsx`

1. **자원 표시** (lines 7-13, 541-567):
```javascript
const RESOURCE_LABELS = {
  gold: "금",
  intel: "정보",
  loot: "전리품",
  material: "원자재",
  etherPts: "에테르",
};

// 오른쪽 상단 자원 패널
<div style={{
  position: "absolute",
  top: "220px",
  right: "30px",
  // ... 스타일
}}>
```

2. **플레이어 HP 바** (lines 519-540):
```javascript
// 캔버스에 HP 바 렌더링
const hpBarWidth = 60;
const hpBarHeight = 8;
const hpBarY = PLAYER_Y + PLAYER_SIZE / 2 + 8;
const hpRatio = Math.max(0, Math.min(1, playerHp / maxHp));

// 동적 색상
ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444";
ctx.fillRect(playerScreenX - hpBarWidth / 2, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

// HP 텍스트
ctx.fillText(`${playerHp}/${maxHp}`, playerScreenX, hpBarY + hpBarHeight + 12);
```

3. **전투 시작** (lines 399-405):
```javascript
startBattle({
  nodeId: `dungeon-${currentSegmentIndex}`,
  kind: "combat",
  label: "던전 몬스터",
  enemyHp: 25 + Math.floor(Math.random() * 10),
});
```

---

## 최근 완료 작업 이력

### v11-17-10:00 (최신)
**커밋**: `1e585cc` - feat: 전투 UX 개선 및 던전 버그 수정
- 전투창 카드 행동력 색상 구분 (주특기: 파란색, 보조특기: 하늘색)
- 캐릭터 창 크기 1.5배 확대 (640px → 960px)
- 던전 캐릭터 밑에 HP 바 추가 (동적 색상)
- 던전 전투 후 초기화 버그 수정
- 던전 전투 시 체력 30 고정 버그 수정

### v11-17-09:30
**커밋**: `15c0efd` - feat: 체력 시스템 구현 및 던전 UI 개선
- 전역 체력 관리 시스템 추가 (playerHp, maxHp)
- 전투 후 체력 상태 유지 및 업데이트
- 던전과 맵에 HP 표시 추가
- 던전에 자원(금, 정보, 전리품, 원자재) 표시 추가
- parry 카드의 counter 속성 제거
- 던전 전투 후 맵 결과 모달 간섭 버그 수정
- 캐릭터 창 HP 동적 연동

### v11-17-08:31 이전
**커밋**: `7dfe69f` - feat: 전투 밸런스 대폭 개선 및 캐릭터 창 접근성 향상
- 플레이어 HP 60/65/70 → 100으로 통일
- 카드 데미지/방어 공식 변경: actionCost * 10 * (1 + speedCost * 0.1)
- C 키로 맵/던전에서 캐릭터 창 접근 가능
- 이벤트 창 크기 2배 확대 (440px → 880px)
- 던전 전투 보상 시스템 구현

---

## 주요 시스템 설명

### 1. 체력 시스템
- **전역 상태**: playerHp, maxHp (useGameState.js)
- **업데이트**: 전투 종료 시 resolveBattle에서 finalState.player.hp 적용
- **사용처**: 전투 시작 시 computeBattlePlan에 전달, 던전/맵 UI 표시

### 2. 캐릭터 빌드 시스템
- **저장**: characterBuild { mainSpecials: [], subSpecials: [] }
- **적용**: 전투창 카드 색상, 전투 손패 구성
- **특기 선택**: 캐릭터 창에서 최대 4장(주특기 3, 보조특기 1)

### 3. 던전 시스템
- **구조**: 5-9개 세그먼트 (복도/방 교차)
- **오브젝트**: 보물상자(40%), 호기심(45%), 전투(15%), 문/출구
- **전투**: ! 마커와 상호작용 시 startBattle 호출
- **탈출**: skipDungeon으로 현재 노드 클리어 및 다음 노드 활성화

### 4. 전투 시스템
- **단계**: select → respond → resolve
- **타임라인**: speedCost 기반 플레이어/적 행동 정렬
- **HP 반영**: 전투 시작 시 현재 HP 사용, 종료 시 finalState HP 저장
- **보상**: 승리 시 BATTLE_REWARDS 기반 자원 지급

---

## 주의사항

1. **HP 시스템**: 전투 시작/종료 시 playerHp 상태 동기화 필수
2. **던전 전투**: 반드시 `!activeBattle` 조건으로 DungeonExploration 렌더링 제어
3. **카드 색상**: characterBuild 상태 확인 후 색상 적용
4. **버전 태그**: 모든 변경사항마다 업데이트 필수
5. **Git 브랜치**: 세션 ID와 일치 확인 후 푸시

---

## 다음 작업 시 체크리스트

- [ ] 사용자 요청 정확히 이해
- [ ] 해당 파일 읽기
- [ ] 변경 수행
- [ ] 버전 태그 업데이트 (MapDemo.jsx line 108)
- [ ] 커밋 메시지 작성 (feat/fix/refactor 등)
- [ ] 브랜치 확인: `claude/game-dev-agent-017C2cnFJNJCQYtZbjfPkpkx`
- [ ] 푸시 실행
- [ ] TodoWrite로 진행 상황 추적

---

## Git 상태 (인계 시점)

**현재 브랜치**: `claude/game-dev-agent-017C2cnFJNJCQYtZbjfPkpkx`
**최신 커밋**: `1e585cc` - feat: 전투 UX 개선 및 던전 버그 수정
**작업 상태**: Clean (커밋되지 않은 변경사항 없음)
**버전 태그**: 11-17-10:00

---

## 빠른 시작 가이드 (다음 에이전트용)

1. **브랜치 확인**:
```bash
git branch
# claude/game-dev-agent-017C2cnFJNJCQYtZbjfPkpkx 확인
```

2. **최신 상태 확인**:
```bash
git status
git log --oneline -5
```

3. **작업 시작**:
   - 사용자 요청 확인
   - 관련 파일 읽기 (Read 도구)
   - 변경 수행 (Edit/Write 도구)
   - 버전 태그 업데이트
   - 커밋 & 푸시

4. **테스트**:
   - 던전 진입 → ! 전투 → HP 변화 확인
   - 캐릭터 창에서 특기 선택 → 전투창 카드 색상 확인
   - 전투 종료 후 HP 유지 확인
