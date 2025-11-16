# 세션 인계 문서

## 작업 규칙 (필수 준수)

### 1. 자동 버전 태그 갱신
- 파일: `/home/user/hahahahgo/src/components/map/MapDemo.jsx`
- 위치: line 105
- 현재: `const PATCH_VERSION_TAG = "11-16-18:30";`
- **모든 변경사항마다 KST 시간으로 자동 갱신** (형식: "MM-DD-HH:MM")

### 2. Git 자동화 (매우 중요!)
- **현재 브랜치**: `claude/setup-sub-agent-01PPb7qJVyj8GMpb6ikpkoSq`
- **브랜치 이름 규칙**: 반드시 `claude/` + 현재 세션 ID로 끝나야 함
- **⚠️ 과거 오류**: 다른 세션 ID 브랜치(`claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7`)로 푸시 시도 → 403 에러 발생
- **해결 방법**: 항상 현재 세션 ID와 일치하는 브랜치 사용 확인

작업 완료 시 자동 커밋 & 푸시:
```bash
git add -A && git commit -m "feat: 설명" && git push -u origin claude/setup-sub-agent-01PPb7qJVyj8GMpb6ikpkoSq
```

**403 에러 발생 시**:
1. 브랜치 이름 확인: `git branch`
2. 세션 ID가 `01PPb7qJVyj8GMpb6ikpkoSq`인지 확인
3. 다르면 올바른 브랜치로 체크아웃 또는 생성

### 3. 작업 방식
- 사용자가 지시한 정확한 수치(px, %, rem 등) 준수
- 복잡한 작업은 TodoWrite 도구로 관리
- 사용자가 지시한 요소가 무엇인지 정확히 확인 (과거 오류 발생 이력 있음)

---

## 현재 코드 상태

### 맵 관련 (`MapDemo.jsx`)
```javascript
// Line 9
const V_SPACING = 360;

// Line 105
const PATCH_VERSION_TAG = "11-16-18:30";

// Line 218
<div className="map-view" ref={mapViewRef} style={{marginLeft: '400px'}}>
```

### 맵 스타일 (`App.css`)
```css
/* Lines 61-71 */
.map-view {
  width: 100%;
  height: calc(100vh - 40px);  /* 세로 최대화 */
  min-height: 1400px;           /* 뷰포트 2배 확장 */
  overflow: auto;
  padding: 24px;
  border-radius: 32px;
  border: 1px solid rgba(118, 134, 185, 0.4);
  background: rgba(5, 8, 13, 0.92);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
}

/* Lines 147-162 - 에테르 바 */
.aether-column {
  position: fixed;
  left: 212px;  /* 맵과 균형 맞춤 */
  top: 50%;
  transform: translateY(-50%);
}

/* Lines 123-136 - 리소스 HUD */
.resource-hud {
  position: fixed;
  right: 32px;
  top: 80px;  /* 위험도 표시 아래 */
}

/* Lines 205-217 - 맵 단계 표시 창 */
.map-phase-display {
  position: fixed;
  left: 50%;
  top: 80px;
  transform: translateX(-50%);
  padding: 16px 32px;
  border-radius: 16px;
  border: 1px solid rgba(118, 134, 185, 0.5);
  background: rgba(8, 11, 19, 0.95);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  z-index: 65;
  text-align: center;
}
```

### 전투 카드 (`LegacyBattleApp.jsx`)
**선택/대응/진행 단계 모두 통일됨 (인라인 스타일 사용)**

```javascript
// 공통 패턴 (모든 단계 동일)
<div className="card-footer">
  <div className="flex items-center justify-center gap-2 text-white font-bold" style={{fontSize: '1.688rem'}}>
    {c.damage != null && c.damage > 0 && <span style={{color: '#fca5a5'}}>⚔️{c.damage}{c.hits?`×${c.hits}`:''}</span>}
    {c.block != null && c.block > 0 && <span style={{color: '#93c5fd'}}>🛡️{c.block}</span>}
    {c.counter !== undefined && <span style={{color: '#d8b4fe'}}>⚡{c.counter}</span>}
  </div>
  <div style={{color: '#67e8f9', fontSize: '1.688rem', marginTop: '0.25rem'}}>⏱️{c.speedCost}</div>
</div>
```

### 전투 스타일 (`legacy-battle.css`)
```css
/* Line 602 - 손패 갭 축소 */
.hand-flags {
  min-height: 8px;  /* 32px → 8px */
}

/* Line 849 - 전투 화면 최대화 */
.battle-fullscreen {
  padding: 0 28px;
}
```

---

## 최근 완료 작업 이력

### v11-16-18:30 (최신)
- 맵 위치: 500px → 400px (100px 왼쪽 이동)
- 맵 세로 최대화: `calc(100vh - 40px)`

### v11-16-18:25
- 선택/대응/진행 단계 카드 표기 통일
- 카드 스탯 숫자 높이 정렬 (fontSize: 1.688rem)
- 맵 500px 이동, 뷰포트 2배 확장
- 손패 갭 축소 (min-height: 8px)

### v11-16-18:15
- 맵 300px 이동
- V_SPACING 복구 (360)
- 뷰포트 확장 (calc(100vh - 200px))
- 맵 중앙 상단 단계 표시 창 추가

---

## 주의사항

1. **요소 식별 주의**: 사용자가 말하는 요소가 정확히 무엇인지 확인
   - 예: "단계 텍스트"가 타임라인의 것인지, 중앙 표시의 것인지 명확히 확인

2. **수치 계산**: px 값 변경 시 정확히 계산
   - "200px 이동" = 현재값 + 200 (오른쪽) 또는 현재값 - 200 (왼쪽)

3. **일관성 유지**: 카드 표기는 모든 단계(select/respond/resolve)에서 동일해야 함

4. **버전 태그**: 절대 빠뜨리지 말 것 - 사용자가 매우 중요하게 생각함

---

## 다음 작업 시 체크리스트

- [ ] 사용자 요청 정확히 이해
- [ ] 해당 파일 읽기
- [ ] 변경 수행
- [ ] 버전 태그 업데이트
- [ ] 커밋 & 푸시
- [ ] TodoWrite로 진행 상황 추적
