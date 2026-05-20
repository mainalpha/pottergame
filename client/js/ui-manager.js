/**
 * Coin toss (Phoenix / blank) and screen shake helpers
 */
(function () {
  const uiManager = {};

  uiManager.showCoinToss = function (data, myUserId) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'coin-overlay';

      const panel = document.createElement('div');
      panel.className = 'coin-panel';

      const title = document.createElement('h2');
      title.className = 'coin-title';
      title.textContent = 'Coin Toss';

      const coin = document.createElement('div');
      coin.className = 'coin';

      const phoenixFace = document.createElement('div');
      phoenixFace.className = 'coin-face coin-phoenix';
      phoenixFace.setAttribute('role', 'img');
      phoenixFace.setAttribute('aria-label', 'Phoenix');

      const blankFace = document.createElement('div');
      blankFace.className = 'coin-face coin-blank';
      coin.append(phoenixFace, blankFace);

      const label = document.createElement('div');
      label.className = 'coin-result-label';
      label.textContent = 'Flipping…';

      panel.appendChild(title);
      panel.appendChild(coin);
      panel.appendChild(label);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      coin.classList.add('coin-flip');

      setTimeout(() => {
        coin.classList.remove('coin-flip');
        const isPhoenix = data.result === 'phoenix';
        coin.classList.add(isPhoenix ? 'coin-show-phoenix' : 'coin-show-blank');

        const profileKey = (id) =>
          Object.keys(data.profiles || {}).find((k) => String(k) === String(id));
        const flipperName =
          data.profiles?.[profileKey(data.flipperId)]?.username || 'A wizard';
        const iFlipped = String(data.flipperId) === String(myUserId);
        const iChoose = String(data.chooserId) === String(myUserId);

        if (iFlipped) {
          label.textContent = isPhoenix
            ? 'Phoenix! You choose your faction.'
            : 'Blank. Your opponent chooses their faction.';
        } else {
          label.textContent = isPhoenix
            ? `${flipperName} got Phoenix and will choose.`
            : 'Blank! Your opponent chooses — you will get the other side.';
        }

        if (!iChoose && !iFlipped) {
          label.textContent = isPhoenix
            ? `${flipperName} got Phoenix.`
            : `${flipperName} got Blank. Waiting for faction choice…`;
        }

        setTimeout(() => {
          overlay.classList.add('coin-overlay--hide');
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 500);
        }, 1800);
      }, 2000);
    });
  };

  uiManager.shakeScreen = function (intensity, duration) {
    const el =
      document.querySelector('.battlefield-canvas') ||
      document.querySelector('.battlefield-center') ||
      document.getElementById('app');
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), duration || 300);
  };

  uiManager.animateDraw = function () {
    const deck = document.getElementById('deck-pile');
    if (!deck) return;
    deck.classList.add('deck-draw');
    setTimeout(() => deck.classList.remove('deck-draw'), 600);
  };

  window.uiManager = uiManager;
})();
