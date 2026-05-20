/**
 * Profile screen — load & save wizard name, avatar, password
 */

const PROFILE_API = '/api/profile';

const HOUSE_LABELS = {
  gryffindor: 'Gryffindor',
  slytherin: 'Slytherin',
  hufflepuff: 'Hufflepuff',
  ravenclaw: 'Ravenclaw'
};

function getAuthToken() {
  return localStorage.getItem('wizard_token') || sessionStorage.getItem('wizard_token');
}

function getAuthHeaders() {
  const token = getAuthToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

function showProfileMessage(text, isSuccess) {
  const el = document.getElementById('profile-message');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle('profile-message--success', !!isSuccess);
  el.classList.toggle('profile-message--error', !isSuccess);
}

function hideProfileMessage() {
  const el = document.getElementById('profile-message');
  if (el) el.hidden = true;
}

function defaultAvatarSvg() {
  return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23c9a84c'/%3E%3Ctext x='60' y='75' text-anchor='middle' font-size='60' fill='%230a0a14'%3E🧙%3C/text%3E%3C/svg%3E";
}

/** XP: 100 points per level; points field in DB is total XP. */
function getXpProgressFromPoints(points) {
  const total = Math.max(0, Number(points) || 0);
  const level = Math.floor(total / 100) + 1;
  const xpInLevel = total % 100;
  return { total, level, xpInLevel, percent: xpInLevel };
}

window.getXpProgressFromPoints = getXpProgressFromPoints;

function applyAvatarToPage(url) {
  const src = url && url.trim() ? url.trim() : defaultAvatarSvg();
  const ids = [
    'profile-avatar',
    'player-avatar',
    'gameover-avatar',
    'menu-avatar',
    'sidebar-avatar'
  ];
  ids.forEach((id) => {
    const img = document.getElementById(id);
    if (img) {
      img.src = src;
      img.onerror = () => {
        img.onerror = null;
        img.src = defaultAvatarSvg();
      };
    }
  });
}

function applyUserToUI(user) {
  if (!user) return;

  window.currentUser = user;

  const nameEl = document.getElementById('profile-username');
  if (nameEl) nameEl.textContent = user.username || '—';

  const houseEl = document.getElementById('profile-house');
  if (houseEl) {
    houseEl.textContent = HOUSE_LABELS[user.house] || user.house || 'House Unknown';
  }

  const greeting = document.getElementById('menu-greeting');
  if (greeting) greeting.textContent = `Welcome, ${user.username || 'Wizard'}`;

  const playerName = document.getElementById('player-name');
  if (playerName) playerName.textContent = user.username || 'You';

  document.getElementById('stat-wins').textContent = String(user.wins ?? 0);
  document.getElementById('stat-losses').textContent = String(user.losses ?? 0);

  const { level, xpInLevel, percent } = getXpProgressFromPoints(user.points ?? 0);
  document.getElementById('stat-level').textContent = String(level);
  document.getElementById('xp-text').textContent = `${xpInLevel} / 100`;
  const xpFill = document.getElementById('xp-bar-fill');
  if (xpFill) xpFill.style.width = `${percent}%`;

  const menuXpText = document.getElementById('menu-xp-text');
  if (menuXpText) menuXpText.textContent = `${xpInLevel} / 100 XP`;
  const menuXpFill = document.getElementById('menu-xp-bar-fill');
  if (menuXpFill) menuXpFill.style.width = `${percent}%`;
  const sidebarName = document.getElementById('sidebar-username');
  if (sidebarName) sidebarName.textContent = user.username || 'You';

  const usernameInput = document.getElementById('input-username');
  if (usernameInput) usernameInput.value = user.username || '';

  const avatarInput = document.getElementById('input-avatar-url');
  if (avatarInput && user.avatar) avatarInput.value = user.avatar;

  applyAvatarToPage(user.avatar);
}

async function loadProfile() {
  const token = getAuthToken();
  if (!token) {
    if (typeof MapsTo === 'function') MapsTo('screen-auth');
    return null;
  }

  hideProfileMessage();

  try {
    const res = await fetch(PROFILE_API, { headers: getAuthHeaders() });
    const data = await res.json();

    if (!res.ok) {
      showProfileMessage(data.error || 'Could not load profile.', false);
      return null;
    }

    applyUserToUI(data.user);
    if (data.user?.id && typeof setCurrentUserId === 'function') {
      setCurrentUserId(String(data.user.id));
    }
    return data.user;
  } catch (err) {
    console.error('loadProfile:', err);
    showProfileMessage('Could not reach the server.', false);
    return null;
  }
}

async function saveProfile() {
  const token = getAuthToken();
  if (!token) {
    showProfileMessage('Please log in again.', false);
    return;
  }

  hideProfileMessage();

  const username = document.getElementById('input-username')?.value?.trim();
  const avatarUrl = document.getElementById('input-avatar-url')?.value?.trim();
  const newPassword = document.getElementById('input-new-password')?.value;

  const body = {};
  if (username) body.username = username;
  if (avatarUrl) body.avatarUrl = avatarUrl;
  if (newPassword) body.newPassword = newPassword;

  if (Object.keys(body).length === 0) {
    showProfileMessage('Change your name, avatar, or password before saving.', false);
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(PROFILE_API, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      showProfileMessage(data.error || 'Save failed.', false);
      return;
    }

    applyUserToUI(data.user);

    const storage =
      localStorage.getItem('wizard_token') ? localStorage : sessionStorage;
    if (data.user?.id) {
      storage.setItem('wizard_user_id', String(data.user.id));
      if (typeof setCurrentUserId === 'function') setCurrentUserId(String(data.user.id));
    }

    document.getElementById('input-new-password').value = '';
    showProfileMessage(data.message || 'Profile saved!', true);
  } catch (err) {
    console.error('saveProfile:', err);
    showProfileMessage('Could not reach the server.', false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function previewAvatarFromInput() {
  const url = document.getElementById('input-avatar-url')?.value?.trim();
  if (url) applyAvatarToPage(url);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);

  document.getElementById('input-avatar-url')?.addEventListener('input', previewAvatarFromInput);
  document.getElementById('input-avatar-url')?.addEventListener('change', previewAvatarFromInput);

  const token = getAuthToken();
  if (token) {
    loadProfile();
  }
});

window.loadProfile = loadProfile;
window.applyUserToUI = applyUserToUI;
window.getAuthToken = getAuthToken;
