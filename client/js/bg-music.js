/* Background music manager using YouTube IFrame API */
(function () {
  'use strict';

  // The YouTube video id and playlist id from the URL provided by the user.
  const DEFAULT_VIDEO_ID = 'UuPb1J_RCJM';
  const DEFAULT_LIST_ID = 'PLsYgm6hOXgDToCj9jZ80rUUXVH93EDyHM';
  const PLAYER_DIV_ID = 'yt-bg-music-player';

  let player = null;
  let ready = false;
  let desiredPlaying = false;
  let playerCreated = false;

  function getVolume() {
    return Math.max(0, Math.min(100, Number(window.appSettings?.volume ?? 70)));
  }

  function isAudible() {
    return getVolume() > 0;
  }

  function pauseForSilentVolume() {
    if (!player || !ready) return;
    try {
      player.pauseVideo();
      player.mute();
    } catch (_) {}
  }

  /* ── UI helpers ── */
  function updateMusicUI() {
    const iconEl = document.getElementById('music-btn-icon');
    const labelEl = document.getElementById('music-btn-label');
    const btn = document.getElementById('btn-music-toggle');
    if (!iconEl || !labelEl || !btn) return;
    if (desiredPlaying) {
      iconEl.textContent = '⏸';
      labelEl.textContent = 'Pause Soundtrack';
      btn.classList.add('btn-music-toggle--playing');
    } else {
      iconEl.textContent = '▶';
      labelEl.textContent = 'Play Soundtrack';
      btn.classList.remove('btn-music-toggle--playing');
    }
  }

  function createPlayer() {
    if (playerCreated) return;
    playerCreated = true;

    const div = document.createElement('div');
    div.id = PLAYER_DIV_ID;
    div.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(div);

    const initPlayer = function () {
      player = new YT.Player(PLAYER_DIV_ID, {
        height: '0',
        width: '0',
        videoId: DEFAULT_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          loop: 1,
          list: DEFAULT_LIST_ID,
          listType: 'playlist',
          playsinline: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: function () {
            ready = true;
            if (desiredPlaying) {
              _doPlay();
            }
          },
          onStateChange: function (e) {
            // Ensure looping — if video ended just advance in playlist
            if (e.data === YT.PlayerState.ENDED) {
              try { player.nextVideo(); } catch (_) {}
            }
          }
        }
      });
    };

    // If API already loaded, initialise immediately
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Store callback; API script calls this when ready
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prevCb === 'function') prevCb();
        initPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.async = true;
        document.head.appendChild(s);
      }
    }
  }

  function _doPlay() {
    if (!player || !ready) return;
    const vol = getVolume();
    if (vol === 0) {
      pauseForSilentVolume();
      return;
    }
    try {
      player.setVolume(vol);
      player.unMute();
      player.playVideo();
    } catch (err) {
      console.warn('[bg-music] play error', err);
    }
  }

  function play() {
    desiredPlaying = true;
    updateMusicUI();
    createPlayer(); // no-op if already created
    if (!isAudible()) {
      pauseForSilentVolume();
      return;
    }
    _doPlay();
  }

  function pause() {
    desiredPlaying = false;
    updateMusicUI();
    if (!player || !ready) return;
    try { player.pauseVideo(); } catch (err) {
      console.warn('[bg-music] pause error', err);
    }
  }

  function toggle() {
    if (desiredPlaying) pause(); else play();
  }

  function setVolume(value) {
    const v = Math.max(0, Math.min(100, Number(value || 0)));
    if (!player || !ready) return;
    try {
      if (v === 0) {
        pauseForSilentVolume();
        return;
      }
      player.setVolume(v);
      if (desiredPlaying) {
        player.unMute();
        const state = player.getPlayerState?.();
        if (state !== 1) player.playVideo();
      }
    } catch (_) {}
  }

  function isPlaying() {
    return desiredPlaying;
  }

  function initFromSettings(settings) {
    if (!settings) return;
    const enabled = !!settings.bgMusicEnabled;
    if (enabled && !desiredPlaying) {
      // Will play on first user interaction if autoplay is blocked
      desiredPlaying = true;
      updateMusicUI();
      createPlayer();
      installResumeOnInteraction();
    } else if (!enabled && desiredPlaying) {
      pause();
    }
    if (ready) setVolume(settings.volume ?? 70);
  }

  function installResumeOnInteraction() {
    // Keep trying on every user interaction until playback actually starts
    const resumeHandler = () => {
      if (!desiredPlaying) {
        // User disabled music — remove handler
        document.removeEventListener('click', resumeHandler, true);
        document.removeEventListener('keydown', resumeHandler, true);
        return;
      }
      if (!playerCreated) createPlayer();
      if (!isAudible()) return;
      _doPlay();
      // Check if playback started; if so, clean up
      setTimeout(() => {
        if (!desiredPlaying) {
          document.removeEventListener('click', resumeHandler, true);
          document.removeEventListener('keydown', resumeHandler, true);
          return;
        }
        try {
          const state = player?.getPlayerState?.();
          // YT.PlayerState.PLAYING === 1
          if (state === 1) {
            document.removeEventListener('click', resumeHandler, true);
            document.removeEventListener('keydown', resumeHandler, true);
          }
        } catch (_) {}
      }, 600);
    };
    document.addEventListener('click', resumeHandler, true);
    document.addEventListener('keydown', resumeHandler, true);
  }

  window.bgMusicManager = {
    initFromSettings,
    play,
    pause,
    toggle,
    setVolume,
    isPlaying,
    updateUI: updateMusicUI
  };
})();
