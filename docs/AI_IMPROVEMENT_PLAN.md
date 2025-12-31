# 몬스터 AI 개선 계획

## 현재 상태 분석

### 현재 AI 구조 (`src/components/battle/utils/enemyAI.js`)

```
decideEnemyMode()      → 랜덤으로 3가지 모드 선택 (aggro/turtle/balanced)
generateEnemyActions() → 모드 기반 카드 조합 생성
shouldEnemyOverdrive() → 항상 false (비활성화됨)
```

### 문제점
1. 완전 랜덤 - 플레이어가 예측/학습 불가
2. 몬스터 종류별 차별화 없음
3. 포커 콤보 인식 없음
4. 동시턴제 특성 미반영

---

## 개선 방안 (우선순위순)

### 1. 몬스터별 고정 패턴 시스템 (최우선)

동시턴제에서 가장 효과적. 플레이어가 패턴을 읽고 대응하는 재미.

**구현 위치:** `src/data/enemies.js` 또는 새 파일 `src/data/enemyPatterns.js`

```javascript
// enemyPatterns.js
export const ENEMY_PATTERNS = {
  // 일반 몬스터: 단순 패턴
  'goblin': {
    type: 'cycle',
    pattern: ['attack', 'attack', 'defense'],
    description: '2연속 공격 후 방어'
  },

  'slime': {
    type: 'cycle',
    pattern: ['defense', 'attack'],
    description: '방어 후 공격 반복'
  },

  'golem': {
    type: 'cycle',
    pattern: ['defense', 'defense', 'attack', 'attack'],
    description: '2방어 2공격 반복'
  },

  // 보스: 복잡한 패턴 + 특수 행동
  'boss_dragon': {
    type: 'phase',
    phases: [
      { hp: 100, pattern: ['attack', 'attack', 'defense'] },
      { hp: 50, pattern: ['charging', 'big_attack', 'rest'] }, // HP 50% 이하
      { hp: 25, pattern: ['rage_attack', 'rage_attack'] }       // HP 25% 이하
    ],
    specialActions: {
      'charging': { type: 'buff', effect: 'next_attack_x2', showIntent: true },
      'big_attack': { type: 'attack', damage: 50 },
      'rage_attack': { type: 'attack', damage: 30, ignoreBlock: true }
    }
  }
};

// 패턴에서 현재 턴 행동 가져오기
export function getPatternAction(enemyId, turnNumber, enemyHp, maxHp) {
  const config = ENEMY_PATTERNS[enemyId];
  if (!config) return null;

  if (config.type === 'cycle') {
    const index = (turnNumber - 1) % config.pattern.length;
    return config.pattern[index];
  }

  if (config.type === 'phase') {
    const hpPercent = (enemyHp / maxHp) * 100;
    const phase = config.phases.find(p => hpPercent <= p.hp) || config.phases[0];
    const index = (turnNumber - 1) % phase.pattern.length;
    return phase.pattern[index];
  }

  return null;
}
```

**enemyAI.js 수정:**

```javascript
import { getPatternAction, ENEMY_PATTERNS } from '../../../data/enemyPatterns';

export function decideEnemyMode(enemy, turnNumber) {
  // 패턴이 있는 몬스터는 패턴 따름
  const patternAction = getPatternAction(enemy.id, turnNumber, enemy.hp, enemy.maxHp);

  if (patternAction) {
    if (patternAction === 'attack' || patternAction === 'big_attack') {
      return { name: '공격적', key: 'aggro', prefer: 'attack', fromPattern: true };
    }
    if (patternAction === 'defense' || patternAction === 'charging') {
      return { name: '수비적', key: 'turtle', prefer: 'defense', fromPattern: true };
    }
  }

  // 패턴 없으면 기존 랜덤
  return choice([
    { name: '공격적', key: 'aggro', prefer: 'attack' },
    { name: '수비적', key: 'turtle', prefer: 'defense' },
    { name: '균형적', key: 'balanced', prefer: 'mixed' }
  ]);
}
```

---

### 2. 적 의도(Intent) 표시 시스템

Slay the Spire 스타일. 다음 턴 행동 미리 보여주기.

**UI 컴포넌트:** `src/components/battle/ui/EnemyIntent.jsx`

```javascript
// EnemyIntent.jsx
export function EnemyIntent({ intent }) {
  const intentIcons = {
    'attack': '⚔️',
    'defense': '🛡️',
    'charging': '⚡',
    'big_attack': '💥',
    'buff': '✨',
    'debuff': '☠️',
    'unknown': '❓'
  };

  return (
    <div className="enemy-intent">
      <span className="intent-icon">{intentIcons[intent.type] || '❓'}</span>
      {intent.damage && <span className="intent-damage">{intent.damage}</span>}
      {intent.block && <span className="intent-block">{intent.block}</span>}
    </div>
  );
}
```

---

### 3. 포커 콤보 인식 AI

적도 콤보를 노리게 만들기.

```javascript
import { detectPokerCombo } from './comboDetection';

function scoreWithCombo(cards, mode) {
  const baseScore = score(mode, cards);
  const combo = detectPokerCombo(cards);

  let comboBonus = 0;
  if (combo) {
    const comboScores = {
      '하이카드': 0,
      '페어': 50,
      '투페어': 100,
      '트리플': 200,
      '플러쉬': 250,
      '풀하우스': 300,
      '포카드': 400,
      '파이브카드': 500
    };
    comboBonus = comboScores[combo.name] || 0;
  }

  return baseScore + comboBonus;
}
```

---

## 구현 순서

### Phase 1: 패턴 시스템 기반 구축
1. [ ] `src/data/enemyPatterns.js` 생성
2. [ ] `getPatternAction()` 함수 구현
3. [ ] `decideEnemyMode()` 수정 - 패턴 우선 적용
4. [ ] 테스트: 고블린, 슬라임 등 2-3개 몬스터 패턴 추가

### Phase 2: 의도 표시 UI
5. [ ] `EnemyIntent.jsx` 컴포넌트 생성
6. [ ] `LegacyBattleApp.jsx`에 의도 표시 연동
7. [ ] 패턴에서 다음 행동 미리 계산하는 로직 추가

### Phase 3: 보스 고급 패턴
8. [ ] HP 페이즈 시스템 구현
9. [ ] 특수 행동 (charging, rage 등) 구현
10. [ ] 보스 1개 테스트 (용 보스 등)

### Phase 4: 콤보 인식
11. [ ] `scoreWithCombo()` 함수 추가
12. [ ] `generateEnemyActions()` 에서 콤보 점수 반영

---

## 테스트 체크리스트

```bash
# 패턴 시스템 테스트
npm test -- --run enemyAI

# 전체 빌드 확인
npm run build

# 실제 플레이 테스트
npm run dev
# → 고블린과 3턴 싸워서 패턴 확인
# → 보스와 싸워서 페이즈 전환 확인
```

---

## 참고: 현재 파일 위치

```
src/
├── components/battle/
│   ├── utils/
│   │   ├── enemyAI.js          ← 메인 수정 대상
│   │   ├── comboDetection.js   ← 콤보 감지 (재사용)
│   │   └── enemyAI.test.js     ← 테스트 추가
│   └── ui/
│       └── (EnemyIntent.jsx 추가)
└── data/
    ├── enemies.js              ← 몬스터 데이터
    └── (enemyPatterns.js 추가)
```

---

## 예상 작업 시간

- Phase 1 (패턴 기반): 30분
- Phase 2 (의도 UI): 20분
- Phase 3 (보스 패턴): 30분
- Phase 4 (콤보): 15분

총 예상: 1.5 ~ 2시간

---

*작성일: 2025-12-23*
*마지막 검토: 순환 의존성 해결 후*
