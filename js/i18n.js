// FocusGrove — i18n (Internationalization)
// Simple translation system for RU/EN

const translations = {
  ru: {
    // Dashboard
    totalHours: 'Всего часов',
    streak: 'Дней подряд',
    balanceMin: 'Баланс (мин)',
    chooseDuration: 'Выбери длительность сессии',
    min: 'мин',
    startFocus: 'Начать фокус',
    nearestRewards: 'Ближайшие награды',
    noRewardsHint: 'Добавь награды, чтобы видеть прогресс',

    // Focus
    target: 'Цель:',
    loadingTree: 'Загрузка...',
    endSession: 'Завершить раньше',
    countdown: 'Обратный ⏬',
    countup: 'Прямой ⏫',

    // Rewards
    rewards: 'Награды',
    addReward: '+ Добавить награду',
    claimedHistory: 'Полученные награды',
    noHistoryHint: 'История пока пуста',
    newReward: 'Новая награда',
    editReward: 'Редактировать награду',
    rewardEmoji: 'Иконка',
    rewardName: 'Название',
    rewardCost: 'Стоимость (минуты фокуса)',
    cancel: 'Отмена',
    save: 'Сохранить',
    claim: 'Получить',
    costLabel: 'мин фокуса',
    rewardProgress: 'из',

    // Settings
    settings: 'Настройки',
    defaultDuration: 'Длительность по умолчанию',
    defaultTimerMode: 'Режим таймера по умолчанию',
    language: 'Язык / Language',
    dangerZone: 'Опасная зона',
    resetAllData: '🗑 Сбросить все данные',

    // Navigation
    home: 'Главная',
    focus: 'Фокус',

    // Modals
    warningTitle: 'Внимание!',
    warningText: 'Ты свернул приложение. В следующий раз прогресс сессии будет обнулён.',
    understood: 'Понял, продолжаю',
    resetTitle: 'Фокус нарушен',
    resetText: 'Прогресс этой сессии обнулён. Попробуй ещё раз — ты справишься!',
    tryAgain: 'Попробую ещё раз',
    congratulations: 'Поздравляем!',
    awesome: 'Круто!',
    confirmDelete: 'Подтверждение',
    confirmDeleteText: 'Вы уверены? Это действие нельзя отменить.',
    confirmResetText: 'Все данные (сессии, награды, настройки) будут удалены навсегда.',
    delete: 'Удалить',
    sessionComplete: 'Сессия завершена!',
    minutesEarned: 'минут заработано',
    great: 'Отлично!',
    sessionCompleteText: 'Твоё дерево выросло! Заработанные минуты добавлены к балансу.',
    rewardClaimed: 'Награда получена!',
  },

  en: {
    // Dashboard
    totalHours: 'Total hours',
    streak: 'Day streak',
    balanceMin: 'Balance (min)',
    chooseDuration: 'Choose session duration',
    min: 'min',
    startFocus: 'Start focus',
    nearestRewards: 'Nearest rewards',
    noRewardsHint: 'Add rewards to track your progress',

    // Focus
    target: 'Target:',
    loadingTree: 'Loading...',
    endSession: 'End early',
    countdown: 'Countdown ⏬',
    countup: 'Count up ⏫',

    // Rewards
    rewards: 'Rewards',
    addReward: '+ Add reward',
    claimedHistory: 'Claimed rewards',
    noHistoryHint: 'No history yet',
    newReward: 'New reward',
    editReward: 'Edit reward',
    rewardEmoji: 'Icon',
    rewardName: 'Name',
    rewardCost: 'Cost (focus minutes)',
    cancel: 'Cancel',
    save: 'Save',
    claim: 'Claim',
    costLabel: 'focus min',
    rewardProgress: 'of',

    // Settings
    settings: 'Settings',
    defaultDuration: 'Default duration',
    defaultTimerMode: 'Default timer mode',
    language: 'Language',
    dangerZone: 'Danger zone',
    resetAllData: '🗑 Reset all data',

    // Navigation
    home: 'Home',
    focus: 'Focus',

    // Modals
    warningTitle: 'Warning!',
    warningText: 'You left the app. Next time your session progress will be reset.',
    understood: 'Got it, continuing',
    resetTitle: 'Focus broken',
    resetText: 'This session\'s progress has been reset. Try again — you can do it!',
    tryAgain: 'I\'ll try again',
    congratulations: 'Congratulations!',
    awesome: 'Awesome!',
    confirmDelete: 'Confirm',
    confirmDeleteText: 'Are you sure? This action cannot be undone.',
    confirmResetText: 'All data (sessions, rewards, settings) will be permanently deleted.',
    delete: 'Delete',
    sessionComplete: 'Session complete!',
    minutesEarned: 'minutes earned',
    great: 'Great!',
    sessionCompleteText: 'Your tree has grown! Earned minutes added to your balance.',
    rewardClaimed: 'Reward claimed!',
  }
};

let currentLang = 'ru';

export function setLanguage(lang) {
  currentLang = lang;
  applyTranslations();
}

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] || translations['ru']?.[key] || key;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) {
      el.textContent = text;
    }
  });

  // Update lang button label
  const langLabel = document.getElementById('lang-label');
  if (langLabel) {
    langLabel.textContent = currentLang.toUpperCase();
  }

  // Update HTML lang attribute
  document.documentElement.lang = currentLang === 'ru' ? 'ru' : 'en';
}

export function initI18n(lang = 'ru') {
  currentLang = lang;
  applyTranslations();
}
