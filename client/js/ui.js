/**
 * SPA Navigation & Screen Management
 * Handles screen transitions, button events, and basic UI logic
 */

const MATCH_WIN_XP = 10;

// Global Navigation Engine
function MapsTo(screenId) {
  const screens = document.querySelectorAll('.screen');
  const targetScreen = document.getElementById(screenId);

  if (!targetScreen) {
    console.error(`Error: Screen with ID '${screenId}' does not exist.`);
    return;
  }

  if (screenId === 'screen-main' || screenId === 'screen-auth') {
    if (typeof window.resetMainMenuState === 'function') {
      window.resetMainMenuState();
    }
  }

  screens.forEach((screen) => {
    screen.classList.add('hidden');
  });

  targetScreen.classList.remove('hidden');
}

// Global alias for compatibility
window.navigateTo = MapsTo;

function clearAuthStorage() {
  localStorage.removeItem('wizard_token');
  localStorage.removeItem('wizard_user_id');
  sessionStorage.removeItem('wizard_token');
  sessionStorage.removeItem('wizard_user_id');
  sessionStorage.removeItem('guest_match_id');
}

async function initAppScreen() {
  const token =
    localStorage.getItem('wizard_token') || sessionStorage.getItem('wizard_token');

  if (!token) {
    clearAuthStorage();
    MapsTo('screen-auth');
    if (typeof window.switchForm === 'function') window.switchForm('form-login');
    return;
  }

  try {
    const res = await fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Invalid session');

    const data = await res.json();
    if (!data.user) throw new Error('No user');

    window.currentUser = data.user;
    if (typeof applyUserToUI === 'function') applyUserToUI(data.user);
    if (typeof setCurrentUserId === 'function') setCurrentUserId(String(data.user.id));

    MapsTo('screen-main');
  } catch {
    clearAuthStorage();
    MapsTo('screen-auth');
    if (typeof window.switchForm === 'function') window.switchForm('form-login');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAppScreen();
  setupNavigation();
});

function setupNavigation() {
  document.getElementById('btn-to-profile')?.addEventListener('click', () => {
    MapsTo('screen-profile');
    if (typeof loadProfile === 'function') loadProfile();
    closeSideMenu();
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    clearAuthStorage();
    MapsTo('screen-auth');
    if (typeof window.switchForm === 'function') window.switchForm('form-login');
    closeSideMenu();
  });

  document.getElementById('btn-open-side-menu')?.addEventListener('click', () => {
    const menu = document.getElementById('side-menu');
    if (menu) {
      menu.removeAttribute('hidden');
      menu.classList.add('open');
      window.soundManager?.play('click');
    }
  });

  document.getElementById('btn-close-side-menu')?.addEventListener('click', () => {
    closeSideMenu();
    window.soundManager?.play('click');
  });

  document.getElementById('btn-open-settings')?.addEventListener('click', () => {
    document.getElementById('overlay-settings')?.classList.remove('hidden');
    window.soundManager?.play('notification');
  });

  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    document.getElementById('overlay-settings')?.classList.add('hidden');
    window.soundManager?.play('click');
  });

  function closeSideMenu() {
    const menu = document.getElementById('side-menu');
    if (menu) {
      menu.classList.remove('open');
      menu.setAttribute('hidden', '');
    }
  }

  document.getElementById('btn-profile-back')?.addEventListener('click', () => MapsTo('screen-main'));

  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    document.getElementById('modal-gameover')?.classList.add('hidden');
    if (typeof window.resetMainMenuState === 'function') window.resetMainMenuState();
    MapsTo('screen-main');
    document.getElementById('btn-mode-bot')?.click();
    window.soundManager?.play('click');
  });

  document.getElementById('btn-back-to-menu')?.addEventListener('click', () => {
    document.getElementById('modal-gameover')?.classList.add('hidden');
    if (typeof window.resetMainMenuState === 'function') window.resetMainMenuState();
    MapsTo('screen-main');
    window.soundManager?.play('click');
  });
}

function setGameoverAvatar(url) {
  const img = document.getElementById('gameover-avatar');
  if (!img) return;
  const fallback =
    typeof defaultAvatarSvg === 'function'
      ? defaultAvatarSvg()
      : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23c9a84c'/%3E%3Ctext x='60' y='75' text-anchor='middle' font-size='60' fill='%230a0a14'%3E🧙%3C/text%3E%3C/svg%3E";
  const src = url && String(url).trim() ? String(url).trim() : fallback;
  img.src = src;
  img.alt = window.currentUser?.username
    ? `${window.currentUser.username} avatar`
    : 'Wizard avatar';
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
}

function updateGameoverXpBar(user) {
  const wrap = document.getElementById('gameover-xp-wrap');
  const text = document.getElementById('gameover-xp-text');
  const fill = document.getElementById('gameover-xp-fill');
  if (!wrap || !user) {
    wrap?.classList.add('hidden');
    return;
  }

  const progress =
    typeof getXpProgressFromPoints === 'function'
      ? getXpProgressFromPoints(user.points ?? 0)
      : { xpInLevel: 0, percent: 0, level: 1 };

  wrap.classList.remove('hidden');
  if (text) text.textContent = `${progress.xpInLevel} / 100 XP · Lvl ${progress.level}`;
  if (fill) fill.style.width = `${progress.percent}%`;
}

/**
 * @param {boolean} isVictory
 * @param {{ xpGained?: number, user?: object }} [options]
 */
window.showVictoryDefeat = function showVictoryDefeat(isVictory, options = {}) {
  const modal = document.getElementById('modal-gameover');
  const title = document.getElementById('gameover-title');
  const subtitle = document.getElementById('gameover-subtitle');
  const stats = document.getElementById('gameover-stats');
  const usernameEl = document.getElementById('gameover-username');

  const user = options.user || window.currentUser;
  const loggedIn = user?.id && !String(user.id).startsWith('guest_');

  if (usernameEl) {
    usernameEl.textContent = loggedIn ? user.username || 'Wizard' : '';
    usernameEl.hidden = !loggedIn;
  }

  setGameoverAvatar(user?.avatar);

  if (title && subtitle) {
    if (isVictory) {
      title.textContent = window.t?.('gameover.title.victory') || 'Victory!';
      title.style.color = '#10b981';
      subtitle.textContent =
        window.t?.('gameover.subtitle.victory') || 'You have vanquished your opponent.';
      window.soundManager?.play('victory');
    } else {
      title.textContent = window.t?.('gameover.title.defeat') || 'Defeat!';
      title.style.color = '#ef4444';
      subtitle.textContent =
        window.t?.('gameover.subtitle.defeat') || 'You were overpowered.';
      window.soundManager?.play('defeat');
    }
  }

  if (stats) {
    if (!loggedIn) {
      stats.textContent =
        window.t?.('gameover.stats.guest') || 'Log in to earn XP and track your progress.';
    } else if (isVictory) {
      const gained = options.xpGained ?? MATCH_WIN_XP;
      const winTpl =
        window.t?.('gameover.stats.win') || '+{xp} XP · Win recorded';
      stats.textContent = winTpl.replace('{xp}', String(gained));
    } else {
      stats.textContent =
        window.t?.('gameover.stats.loss') ||
        'No XP this duel. Win your next match for +10 XP.';
    }
  }

  if (loggedIn) {
    updateGameoverXpBar(user);
  } else {
    document.getElementById('gameover-xp-wrap')?.classList.add('hidden');
  }

  modal?.classList.remove('hidden');
};

window.MATCH_WIN_XP = MATCH_WIN_XP;

document.getElementById('btn-error-reconnect')?.addEventListener('click', () => {
  window.location.reload();
});
