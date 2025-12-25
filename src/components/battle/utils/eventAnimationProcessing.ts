/**
 * @file eventAnimationProcessing.ts
 * @description 액션 이벤트 애니메이션/사운드 시스템
 *
 * ## 기능
 * - 화면 흔들림 효과
 * - 피격/방어 사운드
 * - 이벤트별 시각 피드백
 */

interface ActionEvent {
  type: string;
  actor: string;
  dmg?: number;
  block?: number;
  [key: string]: unknown;
}

interface Action {
  actor: 'player' | 'enemy';
  [key: string]: unknown;
}

interface Actions {
  setEnemyHit: (value: boolean) => void;
  setPlayerHit: (value: boolean) => void;
  setPlayerBlockAnim: (value: boolean) => void;
  setEnemyBlockAnim: (value: boolean) => void;
}

/**
 * 화면 흔들림 효과 트리거
 */
function triggerScreenShake(intensity: number = 1): void {
  const root = document.getElementById('root');
  if (root) {
    root.classList.add('screen-shake');
    setTimeout(() => root.classList.remove('screen-shake'), 250);
  }
}

/**
 * 대미지 팝업 생성
 */
function createDamagePopup(target: 'player' | 'enemy', value: number, type: 'damage' | 'heal' | 'block' = 'damage'): void {
  const popup = document.createElement('div');
  popup.className = `damage-popup ${type === 'damage' && value >= 10 ? 'critical' : ''} ${type}`;
  popup.textContent = type === 'damage' ? `-${value}` : (type === 'heal' ? `+${value}` : `🛡️${value}`);

  if (target === 'enemy') {
    popup.style.right = '350px';
    popup.style.top = '450px';
  } else {
    popup.style.left = '350px';
    popup.style.top = '450px';
  }

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

/**
 * 액션 이벤트 처리: 애니메이션 및 사운드 재생
 */
export function processActionEventAnimations({
  actionEvents,
  action,
  playHitSound,
  playBlockSound,
  actions
}: {
  actionEvents: ActionEvent[];
  action: Action;
  playHitSound: () => void;
  playBlockSound: () => void;
  actions: Actions;
}): void {
  actionEvents.forEach(ev => {
    // 피격 효과 (hit, pierce 타입)
    if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg && ev.dmg > 0) {
      playHitSound();

      const target: 'player' | 'enemy' = ev.actor === 'player' ? 'enemy' : 'player';
      createDamagePopup(target, ev.dmg, 'damage');

      if (ev.actor === 'player') {
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      } else {
        const shakeIntensity = ev.dmg >= 15 ? 3 : (ev.dmg >= 8 ? 2 : 1);
        triggerScreenShake(shakeIntensity);
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      }
    }

    // 방어 효과 (defense 타입)
    if (ev.type === 'defense') {
      playBlockSound();

      if (ev.block && ev.block > 0) {
        const target: 'player' | 'enemy' = ev.actor === 'player' ? 'player' : 'enemy';
        createDamagePopup(target, ev.block, 'block');
      }

      if (ev.actor === 'player') {
        actions.setPlayerBlockAnim(true);
        setTimeout(() => actions.setPlayerBlockAnim(false), 400);
      } else {
        actions.setEnemyBlockAnim(true);
        setTimeout(() => actions.setEnemyBlockAnim(false), 400);
      }
    }

    // 반격 피해
    if (ev.actor === 'counter') {
      playHitSound();

      if (action.actor === 'player') {
        triggerScreenShake(2);
        createDamagePopup('player', ev.dmg || 0, 'damage');
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      } else {
        createDamagePopup('enemy', ev.dmg || 0, 'damage');
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      }
    }
  });
}
