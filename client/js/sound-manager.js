/* Lightweight sound engine using Web Audio API */

const soundPresets = {
  click: { frequency: 350, duration: 0.05, type: 'sine' },
  notification: { frequency: 500, duration: 0.15, type: 'sine' },
  victory: { frequency: 600, duration: 0.3, type: 'triangle' },
  defeat: { frequency: 150, duration: 0.4, type: 'sine' },
  deal: { frequency: 250, duration: 0.07, type: 'sine' }
};

let audioContext = null;
let masterGain = null;
let soundEnabled = true;
let animationEnabled = true;

function ensureAudioContext() {
  if (audioContext && masterGain) return;

  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);
  } catch (error) {
    console.warn('AudioContext unavailable:', error);
    audioContext = null;
    masterGain = null;
  }
}

function playTone({ frequency, duration, type }) {
  if (!soundEnabled) return;
  ensureAudioContext();
  if (!audioContext || !masterGain) return;

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      return;
    });
  }

  const oscillator = audioContext.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0, audioContext.currentTime);
  gain.gain.linearRampToValueAtTime(masterGain.gain.value, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.02);
}

function setVolume(value) {
  if (!masterGain) {
    ensureAudioContext();
  }
  const normalized = Math.max(0, Math.min(100, Number(value || 70))) / 100;
  if (masterGain) {
    masterGain.gain.value = normalized;
  }
}

function setAnimations(enabled) {
  animationEnabled = !!enabled;
}

function play(soundName) {
  if (!soundEnabled || !soundPresets[soundName]) return;
  const settingsVolume = window.appSettings?.volume ?? 70;
  setVolume(settingsVolume);
  playTone(soundPresets[soundName]);
}

function muteSounds() {
  soundEnabled = false;
}

function unmuteSounds() {
  soundEnabled = true;
}

window.soundManager = {
  play,
  setVolume,
  setAnimations,
  muteSounds,
  unmuteSounds
};

window.addEventListener('DOMContentLoaded', () => {
  const volume = window.appSettings?.volume ?? 70;
  const animations = window.appSettings?.animations ?? true;
  setVolume(volume);
  setAnimations(animations);
});
