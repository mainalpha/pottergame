/** Real-time matchmaking and duel events. */

const SOCKET_URL = window.location.origin;
let socket = null;

function getStoredUserId() {
  const raw =
    localStorage.getItem('wizard_user_id') || sessionStorage.getItem('wizard_user_id');
  if (!raw || String(raw).startsWith('guest_')) return null;
  return String(raw);
}

let currentUserId = getStoredUserId();

function samePlayerId(a, b) {
  return String(a) === String(b);
}

function getGuestUserId() {
  let guestId = sessionStorage.getItem('guest_match_id');
  if (!guestId) {
    guestId = `guest_${Math.floor(Math.random() * 100000)}`;
    sessionStorage.setItem('guest_match_id', guestId);
  }
  return guestId;
}

function resolveActiveUserId() {
  const stored = getStoredUserId();
  if (stored) {
    currentUserId = stored;
    window.currentUserId = stored;
    return stored;
  }
  if (currentUserId && !String(currentUserId).startsWith('guest_')) {
    return currentUserId;
  }
  if (window.currentUser?.id) {
    const id = String(window.currentUser.id);
    currentUserId = id;
    window.currentUserId = id;
    return id;
  }
  const token =
    localStorage.getItem('wizard_token') || sessionStorage.getItem('wizard_token');
  if (token) return null;
  const guestId = getGuestUserId();
  currentUserId = guestId;
  window.currentUserId = guestId;
  return guestId;
}

function setCurrentUserId(userId) {
  if (userId == null || String(userId).startsWith('guest_')) return;
  currentUserId = String(userId);
  window.currentUserId = currentUserId;
  const storage =
    localStorage.getItem('wizard_token') ? localStorage : sessionStorage;
  storage.setItem('wizard_user_id', currentUserId);
  sessionStorage.removeItem('guest_match_id');
}

window.setCurrentUserId = setCurrentUserId;

function lookupMapValue(map, userId) {
  if (!map) return undefined;
  const key = Object.keys(map).find((k) => samePlayerId(k, userId));
  return key !== undefined ? map[key] : undefined;
}
let matchProfiles = {};
window.currentUserId = currentUserId;
let currentGameId = null;
let activeMode = '1v1';
let activeMatchSession = null;
let countdownTimer = null;
let battleCurrentTurn = null;

function isMyTurn() {
  return battleCurrentTurn != null && samePlayerId(battleCurrentTurn, resolveActiveUserId());
}

currentUserId = resolveActiveUserId();
window.currentUserId = currentUserId;

function getCastButton() {
  return activeMode === '2v2'
    ? document.getElementById('btn-cast-2v2')
    : document.getElementById('btn-cast-1v1');
}

function getHandContainer() {
  return activeMode === '2v2'
    ? document.getElementById('hand-2v2')
    : document.getElementById('hand-1v1');
}

function clearCountdownTimer() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function hideFullscreenOverlays() {
  document.getElementById('overlay-loading')?.classList.add('hidden');
  document.getElementById('overlay-sorting')?.classList.add('hidden');
  document.getElementById('overlay-countdown')?.classList.add('hidden');
  document.getElementById('faction-reveal')?.classList.add('hidden');
  document.getElementById('overlay-faction-pick')?.classList.add('hidden');
}

function setMenuQueueBanner(visible, text) {
  const banner = document.getElementById('menu-queue-banner');
  const label = document.getElementById('menu-queue-text');
  if (label && text) label.textContent = text;
  banner?.classList.toggle('hidden', !visible);
}

function setQueueButtonsSearching(searching) {
  setMenuQueueBanner(searching, searching ? 'Searching for an opponent…' : '');
  ['btn-mode-1v1', 'btn-mode-2v2', 'btn-mode-bot'].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = searching;
  });
}

function isSessionActive(roomId) {
  return activeMatchSession && roomId === activeMatchSession;
}

function beginMatchSession(roomId) {
  activeMatchSession = roomId;
  currentGameId = roomId;
}

function endMatchSession() {
  activeMatchSession = null;
  currentGameId = null;
}

function resetMainMenuState() {
  endMatchSession();
  clearCountdownTimer();
  setQueueButtonsSearching(false);
  hideFullscreenOverlays();
  document.getElementById('modal-gameover')?.classList.add('hidden');

  if (socket?.connected) {
    socket.emit('leave_queue', { userId: currentUserId });
  }
}

window.resetMainMenuState = resetMainMenuState;
window.setQueueButtonsSearching = setQueueButtonsSearching;

function updateHpBars(hp, myUserId) {
  if (!hp) return;

  const playerHp = document.getElementById('player-hp-number');
  const opponentHp = document.getElementById('opponent-hp-number');
  const playerPips = document.getElementById('player-hp-pips');
  const opponentPips = document.getElementById('opponent-hp-pips');

  const me = String(myUserId || currentUserId);
  const ids = Object.keys(hp);
  const myHp = lookupMapValue(hp, me) ?? hp[ids[0]];
  const oppId =
    ids.find((id) => !samePlayerId(id, me) && id !== 'BOT_WIZARD') ||
    ids.find((id) => !samePlayerId(id, me));
  const oppHp = oppId ? lookupMapValue(hp, oppId) : hp[ids[1]];

  if (playerHp) playerHp.textContent = String(myHp ?? 20);
  if (opponentHp) opponentHp.textContent = String(oppHp ?? 20);

  const fillPips = (el, value) => {
    if (!el) return;
    el.innerHTML = '';
    const maxHp = 20;
    const count = Math.max(0, Math.min(maxHp, Number(value) ?? maxHp));
    for (let i = 0; i < maxHp; i++) {
      const heart = document.createElement('span');
      heart.className = 'hp-heart' + (i < count ? ' hp-heart--full' : ' hp-heart--empty');
      heart.setAttribute('aria-hidden', 'true');
      heart.textContent = '♥';
      el.appendChild(heart);
    }
    el.setAttribute('aria-valuenow', String(count));
    el.setAttribute('aria-valuemax', String(maxHp));
  };

  fillPips(playerPips, myHp);
  fillPips(opponentPips, oppHp);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cardArtHtml(card) {
  const src =
    typeof cardImageFromCard === 'function'
      ? cardImageFromCard(card)
      : card.avatar || card.imageUrl || card.image_url;
  if (src) {
    const label = card.alias || card.name;
    return `<img class="card-art-img" src="${escapeHtml(src)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" referrerpolicy="same-origin">`;
  }
  return '<span class="card-art-fallback" aria-hidden="true">✨</span>';
}

let clashClearTimer = null;

function getClashSlots() {
  if (activeMode === '2v2') {
    return {
      left: document.getElementById('clash-slot-2v2-left'),
      right: document.getElementById('clash-slot-2v2-right')
    };
  }
  return {
    left: document.getElementById('clash-slot-left'),
    right: document.getElementById('clash-slot-right')
  };
}

function clearClashTable() {
  const { left, right } = getClashSlots();
  if (left) left.innerHTML = '';
  if (right) right.innerHTML = '';
}

function scheduleClashClear(ms = 2800) {
  if (clashClearTimer) clearTimeout(clashClearTimer);
  clashClearTimer = setTimeout(() => {
    clearClashTable();
    clashClearTimer = null;
  }, ms);
}

function buildClashCardElement(card, extraClass = '') {
  const cost = card.cost ?? 0;
  const el = document.createElement('div');
  el.className = 'clash-card' + (extraClass ? ` ${extraClass}` : '');
  el.innerHTML = `
    <div class="clash-card-art">${cardArtHtml(card)}</div>
    <div class="clash-card-name">${escapeHtml(card.alias || card.name)}</div>
    <div class="clash-card-stats">
      <span title="Attack">ATK ${card.attack ?? card.power ?? 0}</span>
      <span title="Defense">DEF ${card.defense ?? 0}</span>
      <span class="clash-card-cost" title="Cost">C${cost}</span>
    </div>
  `;
  return el;
}

function normalizeClashCards(cards) {
  if (!cards) return [];
  return Array.isArray(cards) ? cards : [cards];
}

function fillClashSlot(slotEl, cards, outcomeClass = '') {
  if (!slotEl) return;
  slotEl.innerHTML = '';
  const list = normalizeClashCards(cards);
  if (!list.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'clash-slot-cards' + (outcomeClass ? ` ${outcomeClass}` : '');
  list.forEach((card) => {
    wrap.appendChild(buildClashCardElement(card, 'clash-card--reveal'));
  });
  slotEl.appendChild(wrap);
}

function showClashResolution(data) {
  const clashCards = data.clashCards || {};
  const ids = Object.keys(clashCards);
  if (!ids.length) return;

  const me = String(currentUserId);
  const myKey = ids.find((id) => samePlayerId(id, me));
  const oppKey = ids.find((id) => !samePlayerId(id, me));

  const { left, right } = getClashSlots();
  const winnerId = data.winnerId != null ? String(data.winnerId) : null;
  const isDraw = !!data.isDraw;

  let myOutcome = '';
  let oppOutcome = '';
  if (!isDraw && winnerId) {
    if (myKey && samePlayerId(winnerId, myKey)) {
      myOutcome = 'clash-slot-cards--winner';
      oppOutcome = 'clash-slot-cards--loser';
    } else if (oppKey && samePlayerId(winnerId, oppKey)) {
      oppOutcome = 'clash-slot-cards--winner';
      myOutcome = 'clash-slot-cards--loser';
    }
  } else if (isDraw) {
    myOutcome = oppOutcome = 'clash-slot-cards--draw';
  }

  if (myKey) fillClashSlot(left, clashCards[myKey], myOutcome);
  if (oppKey) fillClashSlot(right, clashCards[oppKey], oppOutcome);
}

let lastHandCards = [];
const hiddenPlayedCardIds = new Set();

function getLastHand() {
  return lastHandCards;
}

function updateDeckCount(count) {
  const pile = document.getElementById('deck-pile');
  const n = count ?? 0;
  if (pile) {
    pile.setAttribute('aria-label', `Draw pile: ${n} card${n === 1 ? '' : 's'}`);
    pile.title = n > 0 ? `${n} card${n === 1 ? '' : 's'} in deck` : 'Deck empty';
    pile.classList.toggle('deck-pile--empty', n <= 0);
  }
}

function visibleHandCards(hand) {
  const list = hand || lastHandCards;
  if (!hiddenPlayedCardIds.size) return list;
  return list.filter((c) => !hiddenPlayedCardIds.has(String(c.id)));
}

function setHandAndDeck(hand, deckCount) {
  lastHandCards = hand || [];
  updateDeckCount(deckCount);
  renderHand(visibleHandCards(lastHandCards));
}

function profileDisplayName(profile, fallback) {
  return profile?.username || profile?.name || fallback;
}

function profileAvatarUrl(profile) {
  return profile?.avatar || profile?.avatar_url || '';
}

function applyMatchProfiles(profiles) {
  if (!profiles) return;
  matchProfiles = profiles;
  const activeId = resolveActiveUserId();
  const me = lookupMapValue(profiles, activeId) || window.currentUser;
  const oppId =
    Object.keys(profiles).find((id) => !samePlayerId(id, activeId) && id !== 'BOT_WIZARD') ||
    Object.keys(profiles).find((id) => !samePlayerId(id, activeId));
  const opp = oppId ? profiles[oppId] : null;
  const defaultSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23c9a84c'/%3E%3Ctext x='60' y='75' text-anchor='middle' font-size='60' fill='%230a0a14'%3E🧙%3C/text%3E%3C/svg%3E";
  const setPlayer = (nameId, avatarId, profile, fallbackName) => {
    const nameEl = document.getElementById(nameId);
    const avatarEl = document.getElementById(avatarId);
    if (nameEl) nameEl.textContent = profileDisplayName(profile, fallbackName);
    if (avatarEl) {
      const url = profileAvatarUrl(profile);
      avatarEl.src = url && url.trim() ? url.trim() : defaultSvg;
      avatarEl.onerror = () => {
        avatarEl.onerror = null;
        avatarEl.src = defaultSvg;
      };
    }
  };
  setPlayer('player-name', 'player-avatar', me, profileDisplayName(window.currentUser, 'You'));
  setPlayer(
    'opponent-name',
    'opponent-avatar',
    opp,
    oppId === 'BOT_WIZARD' ? 'Training Bot' : 'Opponent'
  );
}

function showFactionPickOverlay({ canPick = true, message } = {}) {
  const overlay = document.getElementById('overlay-faction-pick');
  const label = document.getElementById('faction-wait-label');
  const waitOnly = document.getElementById('faction-wait-only');

  if (label && message) label.textContent = message;
  if (waitOnly && !canPick) {
    waitOnly.textContent = message || 'Waiting for opponent to choose…';
  }

  overlay?.classList.toggle('faction-pick--waiting', !canPick);
  overlay?.classList.remove('hidden');
}

function hideFactionPickOverlay() {
  const overlay = document.getElementById('overlay-faction-pick');
  overlay?.classList.add('hidden');
  overlay?.classList.remove('faction-pick--waiting');
}

function syncBattleUi(state = {}) {
  if (state.currentTurn !== undefined && state.currentTurn !== null) {
    battleCurrentTurn = state.currentTurn;
  }

  const myTurn = isMyTurn();
  const castBtn = getCastButton();
  const turnBadge = document.getElementById(
    activeMode === '2v2' ? 'turn-badge-2v2' : 'turn-badge-1v1'
  );
  if (turnBadge) {
    turnBadge.textContent = myTurn ? 'Your Turn' : "Opponent's Turn";
  }

  const handEl = getHandContainer();
  handEl?.querySelectorAll('.spell-card').forEach((c) => {
    c.classList.toggle('spell-card--locked', !myTurn);
  });

  if (!myTurn) {
    handEl?.querySelectorAll('.spell-card.selected').forEach((c) => {
      c.classList.remove('selected');
    });
    if (castBtn) {
      castBtn.disabled = true;
      castBtn.setAttribute('aria-disabled', 'true');
    }
    return;
  }

  const selected = handEl?.querySelector('.spell-card.selected');
  if (castBtn) {
    castBtn.disabled = !selected;
    castBtn.setAttribute('aria-disabled', selected ? 'false' : 'true');
  }
}

function renderHand(hand) {
  const handCards = getHandContainer();
  const castBtn = getCastButton();
  if (!handCards) return;
  if (hand) lastHandCards = hand;

  handCards.innerHTML = '';
  if (!hand || hand.length === 0) {
    if (castBtn) castBtn.disabled = true;
    return;
  }
  const myTurn = isMyTurn();
  (hand || []).forEach((card) => {
    const cost = card.cost ?? 0;
    const cardEl = document.createElement('div');
    cardEl.className = 'spell-card' + (myTurn ? '' : ' spell-card--locked');
    cardEl.setAttribute('role', 'listitem');
    cardEl.dataset.cardId = String(card.id);
    cardEl.innerHTML = `
      <div class="card-art">${cardArtHtml(card)}</div>
      <div class="card-name">${escapeHtml(card.alias || card.name)}</div>
      <div class="card-stats">
        <span class="card-stat" title="Attack">ATK ${card.attack ?? card.power ?? 0}</span>
        <span class="card-stat" title="Defense">DEF ${card.defense ?? 0}</span>
        <span class="card-stat card-stat--cost" title="Cost (display only)">C${cost}</span>
      </div>
    `;
    cardEl.addEventListener('click', () => {
      if (!isMyTurn()) return;
      handCards.querySelectorAll('.spell-card.selected').forEach((c) => c.classList.remove('selected'));
      cardEl.classList.add('selected');
      if (castBtn) {
        castBtn.disabled = false;
        castBtn.setAttribute('aria-disabled', 'false');
      }
    });
    handCards.appendChild(cardEl);
  });

  syncBattleUi({});
}

function runServerCountdown(seconds, roomId, onDone) {
  if (!isSessionActive(roomId)) return;

  clearCountdownTimer();

  const countdown = document.getElementById('countdown-wrap');
  const digit = document.getElementById('countdown-digit');

  document.getElementById('overlay-countdown')?.classList.remove('hidden');
  countdown?.classList.remove('hidden');

  let count = seconds;
  if (digit) digit.textContent = String(count);

  countdownTimer = setInterval(() => {
    if (!isSessionActive(roomId)) {
      clearCountdownTimer();
      hideFullscreenOverlays();
      return;
    }

    count -= 1;
    if (count > 0) {
      if (digit) digit.textContent = String(count);
    } else {
      clearCountdownTimer();
      document.getElementById('overlay-countdown')?.classList.add('hidden');
      hideFullscreenOverlays();
      onDone?.();
    }
  }, 1000);
}

function cancelMatchmaking() {
  resetMainMenuState();
  if (typeof MapsTo === 'function') MapsTo('screen-main');
}

document.addEventListener('DOMContentLoaded', () => {
  currentUserId = resolveActiveUserId();
  window.currentUserId = currentUserId;

  hideFullscreenOverlays();
  setQueueButtonsSearching(false);

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 8
  });

  let disconnectTimer = null;

  socket.on('connect', () => {
    clearTimeout(disconnectTimer);
    document.getElementById('overlay-error')?.classList.add('hidden');
    if (currentUserId && currentGameId && activeMatchSession) {
      socket.emit('reconnect_game', { userId: currentUserId });
    }
  });

  socket.on('disconnect', () => {
    clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => {
      document.getElementById('overlay-error')?.classList.remove('hidden');
    }, 4000);
  });

  socket.on('queue_joined', () => {
    setMenuQueueBanner(true, 'Searching for an opponent…');
    setQueueButtonsSearching(true);
  });

  socket.on('match_found', (data) => {
    if (!data?.roomId) return;

    beginMatchSession(data.roomId);
    activeMode = data.mode || '1v1';

    setQueueButtonsSearching(false);
    hideFullscreenOverlays();

    if (data.players) {
      const profiles = {};
      data.players.forEach((p) => {
        profiles[p.id] = { username: p.username, avatar: p.avatar };
      });
      applyMatchProfiles(profiles);
    }

    if (typeof MapsTo === 'function') {
      MapsTo(activeMode === '2v2' ? 'screen-2v2' : 'screen-1v1');
    }
  });

  socket.on('coin_toss', async (data) => {
    const roomId = data.roomId || activeMatchSession;
    if (!roomId || !isSessionActive(roomId)) return;
    if (data.profiles) applyMatchProfiles(data.profiles);
    if (window.uiManager?.showCoinToss) {
      await window.uiManager.showCoinToss(data, currentUserId);
    }
  });

  socket.on('open_faction_pick', (data) => {
    const roomId = data.roomId || activeMatchSession;
    if (!roomId || !isSessionActive(roomId)) return;

    const canPick = samePlayerId(data.chooserId, currentUserId);
    showFactionPickOverlay({
      canPick,
      message: canPick
        ? 'Choose your faction'
        : `${data.chooserName || 'Opponent'} is choosing a faction…`
    });
  });

  socket.on('faction_ready', (data) => {
    hideFactionPickOverlay();
    document.getElementById('faction-pick-actions')?.classList.remove('hidden');
    if (data.profiles) applyMatchProfiles(data.profiles);
    const myFaction = lookupMapValue(data.factions, currentUserId);
    const badge = document.getElementById('player-faction-badge');
    if (badge && myFaction) {
      badge.textContent = myFaction === 'order' ? 'Order of the Phoenix' : 'Death Eaters';
    }
  });

  socket.on('countdown', (data) => {
    const roomId = data.roomId || activeMatchSession;
    if (!roomId || !isSessionActive(roomId)) return;
    runServerCountdown(data.seconds || 3, roomId, () => {
      if (typeof MapsTo === 'function') {
        MapsTo(activeMode === '2v2' ? 'screen-2v2' : 'screen-1v1');
      }
    });
  });

  socket.on('start_game', (data) => {
    const roomId = data?.roomId || activeMatchSession;
    if (roomId && !isSessionActive(roomId)) return;

    hideFullscreenOverlays();
    if (typeof MapsTo === 'function') {
      MapsTo(activeMode === '2v2' ? 'screen-2v2' : 'screen-1v1');
    }

    const timerDisplay = document.getElementById('timer-display-1v1');
    if (timerDisplay) timerDisplay.textContent = data.firstTurn ? '30' : '-';

    if (data.profiles) applyMatchProfiles(data.profiles);
    hiddenPlayedCardIds.clear();
    clearClashTable();
    setHandAndDeck(data.hand || data.deck, data.deckCount);

    syncBattleUi({ currentTurn: data.currentTurn });
  });

  socket.on('hand_update', (data) => {
    setHandAndDeck(data.hand, data.deckCount);
    if (window.uiManager?.animateDraw) window.uiManager.animateDraw();
    syncBattleUi({});
  });

  socket.on('update_state', (data) => {
    const timerDisplay = document.getElementById('timer-display-1v1');
    if (timerDisplay && data.timer !== undefined) {
      timerDisplay.textContent = String(data.timer);
    }

    updateHpBars(data.hp, resolveActiveUserId());
    syncBattleUi(data);
    if (data.profiles) applyMatchProfiles(data.profiles);
  });

  socket.on('state_sync', (data) => {
    if (data.myUserId) {
      setCurrentUserId(String(data.myUserId));
    }
    updateHpBars(data.hp, resolveActiveUserId());
    if (data.profiles) applyMatchProfiles(data.profiles);

    if (data.currentTurn != null) {
      battleCurrentTurn = data.currentTurn;
    }
    syncBattleUi({});
  });

  socket.on('turn_result', (data) => {
    hiddenPlayedCardIds.clear();
    clearClashTable();
    if (data.clashCards) showClashResolution(data);

    if (typeof renderer1v1 !== 'undefined' && renderer1v1) {
      if (data.isCritical) renderer1v1.shakeScreen(15, 400);
      else renderer1v1.shakeScreen(5, 200);
    }

    updateHpBars(data.hp, resolveActiveUserId());
    syncBattleUi({});
    scheduleClashClear();

    getHandContainer()?.querySelectorAll('.spell-card.selected').forEach((c) => c.classList.remove('selected'));
    const castBtn = getCastButton();
    if (castBtn) castBtn.disabled = true;
  });

  socket.on('game_over', async (data) => {
    endMatchSession();
    setQueueButtonsSearching(false);
    hideFullscreenOverlays();

    const won = samePlayerId(data.winnerId, resolveActiveUserId());
    const pointsBefore = window.currentUser?.points ?? 0;
    const token =
      localStorage.getItem('wizard_token') || sessionStorage.getItem('wizard_token');

    let user = window.currentUser;
    if (token && typeof loadProfile === 'function') {
      user = (await loadProfile()) || user;
    }

    const pointsAfter = user?.points ?? pointsBefore;
    const xpGained = won
      ? Math.max(0, pointsAfter - pointsBefore) || data.xpReward || window.MATCH_WIN_XP || 10
      : 0;

    if (typeof showVictoryDefeat === 'function') {
      showVictoryDefeat(won, { user, xpGained });
    }
  });

  socket.on('opponent_disconnected', (data) => {
    alert(data.message);
    cancelMatchmaking();
  });

  socket.on('error', (err) => {
    console.error('Server Error:', err.message);
    if (activeMatchSession) {
      alert(err.message || 'Action failed.');
      return;
    }
    cancelMatchmaking();
    alert('Error: ' + err.message);
  });

  document.getElementById('btn-mode-1v1')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeMode = '1v1';
    setMenuQueueBanner(true, 'Searching for an opponent…');
    setQueueButtonsSearching(true);
    const uid = resolveActiveUserId();
    if (String(uid).startsWith('guest_')) {
      alert('Please log in to play against other wizards.');
      setQueueButtonsSearching(false);
      return;
    }
    socket.emit('join_queue', { mode: '1v1', userId: uid });
  });

  document.getElementById('btn-mode-2v2')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeMode = '2v2';
    setMenuQueueBanner(true, 'Searching for teammates…');
    setQueueButtonsSearching(true);
    const uid = resolveActiveUserId();
    if (String(uid).startsWith('guest_')) {
      alert('Please log in to play team battles.');
      setQueueButtonsSearching(false);
      return;
    }
    socket.emit('join_queue', { mode: '2v2', userId: uid });
  });

  document.getElementById('btn-mode-bot')?.addEventListener('click', (e) => {
    e.stopPropagation();
    activeMode = '1v1';
    setMenuQueueBanner(true, 'Summoning training bot…');
    setQueueButtonsSearching(true);
    const uid = resolveActiveUserId();
    if (!uid) {
      alert('Please wait — loading your profile…');
      setQueueButtonsSearching(false);
      return;
    }
    socket.emit('play_vs_bot', { userId: uid });
  });

  document.getElementById('btn-cast-1v1')?.addEventListener('click', () => {
    if (!isMyTurn()) return;
    const selected = document.querySelector('#hand-1v1 .spell-card.selected');
    if (!selected) return;
    const cardId = selected.dataset.cardId;
    hiddenPlayedCardIds.add(String(cardId));
    socket.emit('cast_spell', {
      userId: String(currentUserId),
      cardId
    });
    renderHand(visibleHandCards());
    getCastButton().disabled = true;
  });

  document.getElementById('btn-cast-2v2')?.addEventListener('click', () => {
    if (!isMyTurn()) return;
    const selected = document.querySelectorAll('#hand-2v2 .spell-card.selected');
    if (selected.length >= 1) {
      const cardIds = Array.from(selected).map((c) => c.dataset.cardId).slice(0, 2);
      cardIds.forEach((id) => hiddenPlayedCardIds.add(String(id)));
      socket.emit('cast_spell', {
        userId: currentUserId,
        cardId: cardIds.length === 1 ? cardIds[0] : cardIds
      });
      renderHand(visibleHandCards());
      getCastButton().disabled = true;
    }
  });

  document.getElementById('btn-surrender-1v1')?.addEventListener('click', () => {
    window.soundManager?.play('click');
    socket.emit('surrender', { userId: currentUserId });
  });

  document.getElementById('btn-surrender-2v2')?.addEventListener('click', () => {
    window.soundManager?.play('click');
    socket.emit('surrender', { userId: currentUserId });
  });

  document.getElementById('btn-cancel-queue')?.addEventListener('click', cancelMatchmaking);
  document.getElementById('btn-cancel-queue-banner')?.addEventListener('click', cancelMatchmaking);

  document.getElementById('btn-pick-order')?.addEventListener('click', () => {
    socket.emit('pick_faction', { userId: String(currentUserId), faction: 'order' });
    const label = document.getElementById('faction-wait-label');
    if (label) label.textContent = 'Order of the Phoenix selected…';
    document.getElementById('faction-pick-actions')?.classList.add('hidden');
  });

  document.getElementById('btn-pick-death')?.addEventListener('click', () => {
    socket.emit('pick_faction', { userId: String(currentUserId), faction: 'death_eaters' });
    const label = document.getElementById('faction-wait-label');
    if (label) label.textContent = 'Death Eaters selected…';
    document.getElementById('faction-pick-actions')?.classList.add('hidden');
  });
});
