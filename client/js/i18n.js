/* Internationalization support for the client UI */

const TRANSLATIONS = {
  en: {
    'main.title': 'Choose Your Duel',
    'main.subtitle': 'Welcome, Wizard',
    'main.mode.solo.title': 'Solo Duel',
    'main.mode.solo.desc': '1 vs 1 — Face a single wizard. Compare spells, last one standing wins.',
    'main.mode.solo.badge': 'Classic',
    'main.mode.bot.title': 'Practice Duel',
    'main.mode.bot.desc': '1 vs Bot — Sharpen your spells against an enchanted automaton.',
    'main.mode.bot.badge': 'Training',
    'main.queue.searching': 'Searching for an opponent…',
    'main.queue.cancel': 'Cancel',
    'main.sideMenu.open': 'Open profile menu',
    'main.sideMenu.close': 'Close profile menu',
    'overlay.countdown': 'Dealing cards…',
    'overlay.loading.title': 'Summoning Opponent…',
    'overlay.loading.subtitle': 'Searching the wizarding world',
    'overlay.loading.cancel': 'Cancel',
    'settings.title': 'Settings',
    'settings.close': 'Close',
    'settings.save': 'Save',
    'settings.volume.label': 'Sound Volume',
    'settings.animations.label': 'Animations',
    'settings.bgmusic.label': 'Background Music',
    'main.settings.open': 'Open settings',
    'gameover.title.victory': 'Victory!',
    'gameover.title.defeat': 'Defeat!',
    'gameover.subtitle.victory': 'You have vanquished your opponent.',
    'gameover.subtitle.defeat': 'You were overpowered.',
    'gameover.action.again': 'Play Again',
    'gameover.action.menu': 'Main Menu',
    'gameover.xp.label': 'Experience',
    'gameover.stats.guest': 'Log in to earn XP and track your progress.',
    'gameover.stats.win': '+{xp} XP · Win recorded',
    'gameover.stats.loss': 'No XP this duel. Win your next match for +10 XP.',
    'settings.speed.label': 'Animation Speed',
    'settings.speed.slow': 'Slow',
    'settings.speed.normal': 'Normal',
    'settings.speed.fast': 'Fast',
    'settings.language.label': 'Language',
    'settings.language.ua': 'Українська',
    'settings.language.en': 'English',
    'settings.theme.label': 'Theme',
    'settings.theme.dark': 'Dark',
    'settings.theme.light': 'Light',
    'settings.notifications.label': 'Notifications',
    'error.title': 'Connection Lost',
    'error.subtitle': 'The magic spark has faded. Server is unreachable.',
    'error.action.reconnect': 'Reconnect',
    'sidebar.profile': 'My Profile',
    'sidebar.settings': 'Settings',
    'sidebar.catalog': 'Card Codex',
    'sidebar.logout': 'Logout',
    'auth.login.title': 'Enter the Wizarding World',
    'auth.register.title': 'Join the Order',
    'auth.forgot.title': 'Restore Your Magic',
    'auth.reset.title': 'Forge New Magic'
  },
  ua: {
    'main.title': 'Виберіть свій поєдинок',
    'main.subtitle': 'Ласкаво просимо, чародій',
    'main.mode.solo.title': 'Соло поєдинок',
    'main.mode.solo.desc': '1 на 1 — Вийдіть проти одного чарівника. Хто залишиться останнім, той переміг.',
    'main.mode.solo.badge': 'Класика',
    'main.mode.bot.title': 'Тренувальний поєдинок',
    'main.mode.bot.desc': '1 проти бота — Тренуйте заклинання проти зачарованого автомата.',
    'main.mode.bot.badge': 'Тренування',
    'main.queue.searching': 'Пошук супротивника…',
    'main.queue.cancel': 'Скасувати',
    'main.sideMenu.open': 'Відкрити меню профілю',
    'main.sideMenu.close': 'Закрити меню профілю',
    'overlay.countdown': 'Роздача карт…',
    'overlay.loading.title': 'Закликаємо супротивника…',
    'overlay.loading.subtitle': 'Пошук суперника у магічному світі',
    'overlay.loading.cancel': 'Скасувати',
    'settings.title': 'Налаштування',
    'settings.close': 'Закрити',
    'settings.save': 'Зберегти',
    'settings.volume.label': 'Гучність звуку',
    'settings.animations.label': 'Анімації',
    'settings.bgmusic.label': 'Фонова музика',
    'main.settings.open': 'Відкрити налаштування',
    'gameover.title.victory': 'Перемога!',
    'gameover.title.defeat': 'Поразка!',
    'gameover.subtitle.victory': 'Ви перемогли свого супротивника.',
    'gameover.subtitle.defeat': 'Вас було переможено.',
    'gameover.action.again': 'Грати ще',
    'gameover.action.menu': 'Головне меню',
    'gameover.xp.label': 'Досвід',
    'gameover.stats.guest': 'Увійдіть в акаунт, щоб отримувати XP і вести статистику.',
    'gameover.stats.win': '+{xp} XP · Перемогу зараховано',
    'gameover.stats.loss': 'XP за цей поєдинок не нараховано. Перемога дає +10 XP.',
    'settings.speed.label': 'Швидкість анімації',
    'settings.speed.slow': 'Повільно',
    'settings.speed.normal': 'Нормально',
    'settings.speed.fast': 'Швидко',
    'settings.language.label': 'Мова',
    'settings.language.ua': 'Українська',
    'settings.language.en': 'English',
    'settings.theme.label': 'Тема',
    'settings.theme.dark': 'Темна',
    'settings.theme.light': 'Світла',
    'settings.notifications.label': 'Сповіщення',
    'error.title': 'Втрачено з’єднання',
    'error.subtitle': 'Магічна іскра згасла. Сервер недоступний.',
    'error.action.reconnect': 'Поновити з’єднання',
    'sidebar.profile': 'Мій профіль',
    'sidebar.settings': 'Налаштування',
    'sidebar.catalog': 'Кодекс карт',
    'sidebar.logout': 'Вийти',
    'auth.login.title': 'Увійдіть у світ чарівників',
    'auth.register.title': 'Приєднатися до Ордену',
    'auth.forgot.title': 'Відновіть свою магію',
    'auth.reset.title': 'Створіть нову магію'
  }
};

let currentLanguage = 'en';

function getTranslation(key) {
  return TRANSLATIONS[currentLanguage]?.[key] || TRANSLATIONS.en[key] || '';
}

function translateElement(element) {
  const key = element.dataset.i18n;
  if (!key) return;
  const translation = getTranslation(key);
  if (!translation) return;

  if (element.tagName === 'OPTION') {
    element.textContent = translation;
    return;
  }

  if (element.tagName === 'INPUT' && element.type === 'button') {
    element.value = translation;
    return;
  }

  if (element.hasAttribute('aria-label')) {
    element.setAttribute('aria-label', translation);
  }

  // For buttons with child spans keep icon span, only update text
  const btnIcon = element.querySelector('.btn-icon');
  if (btnIcon) {
    // Replace text node after the icon
    const nodes = [...element.childNodes];
    nodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
    element.appendChild(document.createTextNode(' ' + translation));
    return;
  }

  element.textContent = translation;
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(translateElement);
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) {
    lang = 'en';
  }
  currentLanguage = lang;
  window.currentLanguage = lang;
  translatePage();
}

function getLanguage() {
  return currentLanguage;
}

window.setLanguage = setLanguage;
window.getLanguage = getLanguage;
window.translatePage = translatePage;
window.t = getTranslation;

window.addEventListener('DOMContentLoaded', () => {
  const initial = window.appSettings?.language || 'en';
  setLanguage(initial);
});
