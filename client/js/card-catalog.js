/**
 * Card Codex — browse all game cards and view details (Clash Royale–style panel).
 */
(function () {
  'use strict';

  let allCards = [];
  let activeFilter = 'all';
  let cardsLoaded = false;
  let cardsLoading = false;

  const btnCatalog = document.getElementById('btn-card-catalog');
  const overlayCatalog = document.getElementById('overlay-card-catalog');
  const overlayDetail = document.getElementById('overlay-card-detail');
  const catalogGrid = document.getElementById('catalog-grid');
  const catalogLoading = document.getElementById('catalog-loading');
  const catalogError = document.getElementById('catalog-error');

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function onScreenChange(screenId) {
    if (screenId !== 'screen-main') {
      closeCatalog();
    }
  }

  function hookMapsTo() {
    const orig = window.MapsTo;
    if (typeof orig !== 'function' || orig._cardCatalogHook) return;

    function mapsToWrapped(screenId) {
      orig(screenId);
      onScreenChange(screenId);
    }
    mapsToWrapped._cardCatalogHook = true;
    window.MapsTo = mapsToWrapped;
    window.navigateTo = mapsToWrapped;
  }

  function factionLabel(card) {
    const side = card.side || (card.faction === 'death_eaters' ? 'evil' : 'good');
    if (side === 'evil' || card.faction === 'death_eaters') {
      return { text: 'Death Eaters', css: 'card-detail-meta-bar--evil' };
    }
    return { text: 'Order of the Phoenix', css: 'card-detail-meta-bar--good' };
  }

  function powerTier(power) {
    const p = Number(power) || 0;
    if (p >= 10) return 'Legendary';
    if (p >= 8) return 'Epic';
    if (p >= 6) return 'Rare';
    return 'Common';
  }

  function cardImageSrc(card) {
    if (typeof cardImageFromCard === 'function') return cardImageFromCard(card);
    return card.imageUrl || card.image_url || '';
  }

  async function fetchCards() {
    if (cardsLoaded || cardsLoading) return;
    cardsLoading = true;
    catalogLoading?.classList.remove('hidden');
    catalogError?.classList.add('hidden');

    try {
      const res = await fetch('/api/cards');
      if (!res.ok) throw new Error('Failed to load cards');
      const data = await res.json();
      allCards = Array.isArray(data.cards) ? data.cards : [];
      cardsLoaded = true;
    } catch (err) {
      console.warn('[card-catalog]', err);
      if (catalogError) {
        catalogError.textContent = 'Could not load cards. Try again later.';
        catalogError.classList.remove('hidden');
      }
    } finally {
      cardsLoading = false;
      catalogLoading?.classList.add('hidden');
    }
  }

  function filteredCards() {
    if (activeFilter === 'all') return allCards;
    return allCards.filter((c) => c.faction === activeFilter);
  }

  function renderCatalogGrid() {
    if (!catalogGrid) return;
    const list = filteredCards();
    catalogGrid.innerHTML = '';

    if (!list.length) {
      catalogGrid.innerHTML = '<p class="catalog-empty">No cards in this category.</p>';
      return;
    }

    list.forEach((card) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'catalog-card' + (card.faction === 'death_eaters' ? ' catalog-card--evil' : ' catalog-card--good');
      btn.setAttribute('role', 'listitem');
      btn.dataset.cardId = String(card.id);

      const src = cardImageSrc(card);
      const art = src
        ? `<img class="catalog-card-img" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="same-origin">`
        : '<span class="catalog-card-fallback" aria-hidden="true">✨</span>';

      btn.innerHTML = `
        <span class="catalog-card-art">${art}</span>
        <span class="catalog-card-name">${escapeHtml(card.name)}</span>
        <span class="catalog-card-cost">${escapeHtml(card.cost ?? 0)}</span>
      `;

      btn.addEventListener('click', () => openCardDetail(card));
      catalogGrid.appendChild(btn);
    });
  }

  function statRow(icon, label, value) {
    return `
      <div class="card-detail-stat-row">
        <span class="card-detail-stat-icon" aria-hidden="true">${icon}</span>
        <span class="card-detail-stat-label">${escapeHtml(label)}</span>
        <span class="card-detail-stat-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function openCardDetail(card) {
    if (!overlayDetail || !card) return;

    const nameEl = document.getElementById('card-detail-name');
    const imgEl = document.getElementById('card-detail-img');
    const costEl = document.getElementById('card-detail-cost');
    const factionEl = document.getElementById('card-detail-faction');
    const typeEl = document.getElementById('card-detail-type');
    const descEl = document.getElementById('card-detail-desc');
    const statsEl = document.getElementById('card-detail-stats');
    const barEl = document.getElementById('card-detail-faction-bar');

    const faction = factionLabel(card);
    const atk = card.attack ?? card.power ?? 0;
    const def = card.defense ?? 0;
    const pwr = card.power ?? 0;
    const cost = card.cost ?? 0;

    if (nameEl) nameEl.textContent = card.name || '—';
    if (costEl) costEl.textContent = String(cost);
    if (factionEl) factionEl.textContent = faction.text;
    if (typeEl) typeEl.textContent = powerTier(pwr);
    if (descEl) descEl.textContent = card.description || 'No description available.';
    if (barEl) {
      barEl.className = 'card-detail-meta-bar ' + faction.css;
    }

    if (imgEl) {
      const src = cardImageSrc(card);
      imgEl.referrerPolicy = 'same-origin';
      imgEl.src = src || '';
      imgEl.alt = card.name || 'Card portrait';
      imgEl.style.display = src ? '' : 'none';
      if (typeof bindCardImgFallback === 'function') {
        bindCardImgFallback(imgEl, 'catalog-card-fallback');
      } else {
        imgEl.onerror = () => {
          imgEl.style.display = 'none';
        };
      }
    }

    if (statsEl) {
      statsEl.innerHTML = [
        statRow('⚔', 'Attack', atk),
        statRow('🛡', 'Defense', def),
        statRow('✨', 'Power', pwr),
        statRow('💎', 'Cost', cost),
        statRow('🏛', 'Faction', faction.text),
        statRow('📜', 'Rarity', powerTier(pwr))
      ].join('');
    }

    overlayDetail.classList.remove('hidden');
  }

  function closeCardDetail() {
    overlayDetail?.classList.add('hidden');
  }

  async function openCatalog() {
    if (!overlayCatalog) return;
    overlayCatalog.classList.remove('hidden');
    await fetchCards();
    renderCatalogGrid();
  }

  function closeCatalog() {
    overlayCatalog?.classList.add('hidden');
    closeCardDetail();
  }

  function setFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.catalog-filter').forEach((btn) => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('catalog-filter--active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderCatalogGrid();
  }

  document.addEventListener('DOMContentLoaded', () => {
    hookMapsTo();

    btnCatalog?.addEventListener('click', openCatalog);
    document.getElementById('btn-catalog-close')?.addEventListener('click', closeCatalog);
    document.getElementById('btn-card-detail-close')?.addEventListener('click', closeCardDetail);

    overlayCatalog?.addEventListener('click', (e) => {
      if (e.target === overlayCatalog) closeCatalog();
    });
    overlayDetail?.addEventListener('click', (e) => {
      if (e.target === overlayDetail) closeCardDetail();
    });

    document.querySelectorAll('.catalog-filter').forEach((btn) => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter || 'all'));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!overlayDetail?.classList.contains('hidden')) {
        closeCardDetail();
        e.preventDefault();
        return;
      }
      if (!overlayCatalog?.classList.contains('hidden')) {
        closeCatalog();
        e.preventDefault();
      }
    });

  });

  window.openCardCatalog = openCatalog;
})();
