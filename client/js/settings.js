/* Persistent client settings and UI controls */

const SETTINGS_KEY = 'wizard_settings';
const DEFAULT_SETTINGS = {
  volume: 70,
  animations: true,
  speed: 'normal',
  language: 'en',
  theme: 'dark',
  notifications: true,
  bgMusicEnabled: true
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('Invalid saved settings, resetting.', err);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings(settings);
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
}

function applySettings(settings) {
  if (!settings) return;
  window.appSettings = { ...DEFAULT_SETTINGS, ...settings };

  applyTheme(window.appSettings.theme);
  document.body.classList.toggle('no-animations', !window.appSettings.animations);
  document.body.dataset.animSpeed = window.appSettings.speed;

  if (typeof window.setLanguage === 'function') {
    window.setLanguage(window.appSettings.language);
  }

  if (window.soundManager?.setVolume) {
    window.soundManager.setVolume(window.appSettings.volume);
  }

  if (window.soundManager?.setAnimations) {
    window.soundManager.setAnimations(window.appSettings.animations);
  }

  if (window.bgMusicManager && typeof window.bgMusicManager.initFromSettings === 'function') {
    window.bgMusicManager.initFromSettings(window.appSettings);
    if (window.appSettings.bgMusicEnabled) {
      if (window.appSettings.volume > 0) {
        setTimeout(() => {
          try { window.bgMusicManager.play(); } catch (e) {};
        }, 500);
      }
    } else {
      try { window.bgMusicManager.pause(); } catch (e) {};
    }
    // ensure bg music volume follows global volume
    if (typeof window.bgMusicManager.setVolume === 'function') {
      window.bgMusicManager.setVolume(window.appSettings.volume);
    }
  }
}

function updateVolumeLabel(value) {
  const el = document.getElementById('setting-volume-value');
  if (el) {
    el.textContent = `${value}`;
  }
}

function renderSettingsForm(settings) {
  const volEl = document.getElementById('setting-volume');
  if (volEl) {
    volEl.min = '0';
    volEl.max = '100';
    volEl.step = '1';
    volEl.value = String(settings.volume);
  }
  updateVolumeLabel(settings.volume);

  const animEl = document.getElementById('setting-animations');
  if (animEl) animEl.checked = !!settings.animations;
  const speedEl = document.getElementById('setting-speed');
  if (speedEl) speedEl.value = settings.speed;
  const langEl = document.getElementById('setting-language');
  if (langEl) langEl.value = settings.language;
  const themeEl = document.getElementById('setting-theme');
  if (themeEl) themeEl.value = settings.theme;
  const notifEl = document.getElementById('setting-notifications');
  if (notifEl) notifEl.checked = !!settings.notifications;
  const bgMusicEl = document.getElementById('setting-bg-music');
  if (bgMusicEl) bgMusicEl.checked = !!settings.bgMusicEnabled;
}

function bindSettingsEvents() {
  document.getElementById('setting-volume')?.addEventListener('input', (event) => {
    const value = Number(event.target.value || 0);
    const settings = { ...window.appSettings, volume: value };
    updateVolumeLabel(value);
    // Update music volume live without restarting player
    if (window.bgMusicManager?.setVolume) {
      window.bgMusicManager.setVolume(value);
    }
    saveSettings(settings);
  });

  document.getElementById('setting-animations')?.addEventListener('change', (event) => {
    const settings = { ...window.appSettings, animations: event.target.checked };
    saveSettings(settings);
  });

  document.getElementById('setting-speed')?.addEventListener('change', (event) => {
    const settings = { ...window.appSettings, speed: event.target.value };
    saveSettings(settings);
  });

  document.getElementById('setting-language')?.addEventListener('change', (event) => {
    const lang = event.target.value;
    const settings = { ...window.appSettings, language: lang };
    // Apply language immediately so everything translates at once
    if (typeof window.setLanguage === 'function') window.setLanguage(lang);
    saveSettings(settings);
    // Re-render form so select option labels update
    renderSettingsForm(window.appSettings);
  });

  document.getElementById('setting-theme')?.addEventListener('change', (event) => {
    const settings = { ...window.appSettings, theme: event.target.value };
    saveSettings(settings);
  });

  document.getElementById('setting-notifications')?.addEventListener('change', (event) => {
    const settings = { ...window.appSettings, notifications: event.target.checked };
    saveSettings(settings);
  });

  document.getElementById('setting-bg-music')?.addEventListener('change', (event) => {
    const enabled = event.target.checked;
    const settings = { ...window.appSettings, bgMusicEnabled: enabled };
    saveSettings(settings);
    // Trigger immediately on user interaction (bypass autoplay policy)
    if (window.bgMusicManager) {
      if (enabled) {
        window.bgMusicManager.play();
      } else {
        window.bgMusicManager.pause();
      }
    }
  });

  document.getElementById('btn-settings-save')?.addEventListener('click', () => {
    if (window.appSettings) {
      saveSettings(window.appSettings);
    }
    document.getElementById('overlay-settings')?.classList.add('hidden');
  });

  document.getElementById('btn-settings-close-bottom')?.addEventListener('click', () => {
    document.getElementById('overlay-settings')?.classList.add('hidden');
  });

  document.getElementById('btn-settings-close')?.addEventListener('click', () => {
    document.getElementById('overlay-settings')?.classList.add('hidden');
  });
}

window.applyAppSettings = applySettings;
window.loadAppSettings = loadSettings;
window.saveAppSettings = saveSettings;

window.addEventListener('DOMContentLoaded', () => {
  const settings = loadSettings();
  applySettings(settings);
  renderSettingsForm(settings);
  bindSettingsEvents();
});
