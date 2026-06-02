// FocusGrove — Main Application Orchestrator

import { initI18n, setLanguage, getLanguage, t } from './i18n.js';
import * as Storage from './storage.js';
import { FocusTimer } from './timer.js';
import { VisibilityMonitor } from './visibility.js';
import * as Rewards from './rewards.js';

// Elements
const appScreens = document.querySelectorAll('.screen');
const navButtons = document.querySelectorAll('.nav-btn');
const bottomNav = document.getElementById('bottom-nav');

// State
let currentSession = null;
let visibilityMonitor = null;
let treeInstance = null; // We'll load tree dynamically to save initial load time
let isFocusModeActive = false;

// ---- Initialization ----

async function initApp() {
  const settings = Storage.getSettings();
  initI18n(settings.language);

  updateDashboardStats();
  initNavigation();
  initSettings(settings);
  initFocusStart();
  initModals();

  Rewards.setBalanceChangeCallback(() => {
    updateDashboardStats();
    if (document.getElementById('screen-rewards').classList.contains('active')) {
      Rewards.renderRewardsList(document.getElementById('rewards-list'));
      Rewards.renderHistory(document.getElementById('rewards-history'));
    }
  });

  // Render initial previews if on dashboard
  Rewards.renderRewardsPreview(document.getElementById('rewards-preview-list'));

  // Preload tree module silently
  try {
    const { FocusTree } = await import('./tree.js');
    treeInstance = new FocusTree('tree-container');
    treeInstance.init();
    // Hide tree canvas initially since we aren't focusing
    const canvas = document.querySelector('#tree-container canvas');
    if (canvas) canvas.style.opacity = '0';
  } catch (e) {
    console.warn("Failed to preload tree.js", e);
  }
}

// ---- Navigation ----

function initNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Prevent leaving focus screen if active via normal nav
      if (isFocusModeActive && btn.dataset.screen !== 'focus') {
        // Can't navigate away during focus unless ending early
        return;
      }
      switchScreen(btn.dataset.screen);
    });
  });

  // Dashboard lang toggle
  document.getElementById('btn-lang').addEventListener('click', () => {
    const newLang = getLanguage() === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
    Storage.saveSettings({ language: newLang });
    updateDashboardStats(); // refresh strings
    updateSettingsUI();
  });
}

function switchScreen(screenId) {
  appScreens.forEach(s => s.classList.remove('active'));
  navButtons.forEach(b => b.classList.remove('active'));

  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) targetScreen.classList.add('active');

  const targetNav = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (targetNav) targetNav.classList.add('active');

  // Specific screen logic
  if (screenId === 'rewards') {
    Rewards.renderRewardsList(document.getElementById('rewards-list'));
    Rewards.renderHistory(document.getElementById('rewards-history'));
    document.getElementById('rewards-balance').textContent = Storage.getAvailableBalance();
  } else if (screenId === 'dashboard') {
    updateDashboardStats();
    Rewards.renderRewardsPreview(document.getElementById('rewards-preview-list'));
  }
}

// ---- Dashboard ----

function updateDashboardStats() {
  document.getElementById('stat-total-hours').textContent = Storage.getTotalFocusHours();
  document.getElementById('stat-streak').textContent = Storage.getStreak();
  document.getElementById('stat-balance').textContent = Storage.getAvailableBalance();
  const balanceRewardsBadge = document.getElementById('rewards-balance');
  if (balanceRewardsBadge) {
    balanceRewardsBadge.textContent = Storage.getAvailableBalance();
  }
}

function initFocusStart() {
  const durationBtns = document.querySelectorAll('.duration-btn');
  const customInput = document.getElementById('duration-custom');
  const startBtn = document.getElementById('btn-start-focus');

  let selectedDuration = Storage.getSettings().defaultDuration;

  // Set initial active
  durationBtns.forEach(btn => {
    if (parseInt(btn.dataset.duration) === selectedDuration) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  durationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      durationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      customInput.value = '';
      selectedDuration = parseInt(btn.dataset.duration, 10);
    });
  });

  customInput.addEventListener('input', () => {
    if (customInput.value) {
      durationBtns.forEach(b => b.classList.remove('active'));
      selectedDuration = parseInt(customInput.value, 10);
    }
  });

  startBtn.addEventListener('click', () => {
    if (selectedDuration >= 1) {
      startFocusSession(selectedDuration);
    }
  });
}

// ---- Focus Session Logic ----

async function startFocusSession(minutes) {
  isFocusModeActive = true;
  switchScreen('focus');
  bottomNav.classList.add('nav-hidden');

  const settings = Storage.getSettings();
  document.getElementById('session-target-value').textContent = `${minutes} ${t('min')}`;

  // Ensure tree is ready
  if (!treeInstance) {
    const { FocusTree } = await import('./tree.js');
    treeInstance = new FocusTree('tree-container');
    treeInstance.init();
  }
  const canvas = document.querySelector('#tree-container canvas');
  if (canvas) {
    canvas.style.transition = 'opacity 1s ease';
    canvas.style.opacity = '1';
  }
  document.getElementById('tree-loading').style.display = 'none';

  // Setup Timer
  const durationSeconds = minutes * 60;
  
  currentSession = new FocusTimer({
    duration: durationSeconds,
    mode: settings.timerMode,
    onTick: (elapsed, remaining, progress) => {
      document.getElementById('timer-value').textContent = currentSession.getDisplayTime();
      document.getElementById('focus-progress-fill').style.width = `${progress * 100}%`;
      document.getElementById('focus-progress-text').textContent = `${Math.floor(progress * 100)}%`;
      
      // Update tree growth
      if (treeInstance) {
        treeInstance.setProgress(progress);
      }
    },
    onComplete: (totalElapsed) => {
      handleSessionComplete(true, minutes);
    },
    onPause: () => {
      // Tree stops growing during pause
    }
  });

  // Setup Visibility Monitor
  visibilityMonitor = new VisibilityMonitor({
    onFirstLeave: () => {
      currentSession.pause();
      document.getElementById('modal-warning').classList.add('active');
    },
    onSecondLeave: () => {
      handleSessionReset();
    },
    onReturn: () => {
      // Do nothing, wait for modal dismiss
    }
  });

  currentSession.start();
  visibilityMonitor.start();
  
  // Timer Mode Toggle
  const btnTimerMode = document.getElementById('btn-timer-mode');
  btnTimerMode.onclick = () => {
    const newMode = currentSession.mode === 'countdown' ? 'countup' : 'countdown';
    currentSession.setMode(newMode);
    Storage.saveSettings({ timerMode: newMode });
    document.getElementById('timer-value').textContent = currentSession.getDisplayTime();
    document.getElementById('timer-mode-icon').textContent = newMode === 'countdown' ? '↓' : '↑';
  };
  document.getElementById('timer-mode-icon').textContent = settings.timerMode === 'countdown' ? '↓' : '↑';

  // End early button
  document.getElementById('btn-end-focus').onclick = () => {
    const elapsedMinutes = Math.floor(currentSession.getElapsed() / 60);
    handleSessionComplete(false, elapsedMinutes);
  };
}

function handleSessionComplete(isFull, earnedMinutes) {
  cleanupFocusSession();

  if (earnedMinutes > 0) {
    Storage.saveSession({
      duration: earnedMinutes * 60,
      targetMinutes: earnedMinutes, // Storing what they actually did
      completed: isFull
    });
    
    // Show success modal
    document.getElementById('complete-minutes').textContent = earnedMinutes;
    document.getElementById('complete-text').textContent = t('sessionCompleteText');
    document.getElementById('modal-complete').classList.add('active');
  } else {
    // If < 1 minute, just exit
    exitFocusMode();
  }
}

function handleSessionReset() {
  cleanupFocusSession();
  document.getElementById('modal-warning').classList.remove('active');
  document.getElementById('modal-reset').classList.add('active');
}

function cleanupFocusSession() {
  if (currentSession) currentSession.stop();
  if (visibilityMonitor) visibilityMonitor.stop();
}

function exitFocusMode() {
  isFocusModeActive = false;
  bottomNav.classList.remove('nav-hidden');
  
  if (treeInstance) {
    treeInstance.setProgress(0); // reset tree
  }

  updateDashboardStats();
  switchScreen('dashboard');
}

// ---- Settings & Modals ----

function initSettings(settings) {
  const sDuration = document.getElementById('setting-duration');
  sDuration.value = settings.defaultDuration;
  sDuration.addEventListener('change', () => {
    Storage.saveSettings({ defaultDuration: parseInt(sDuration.value) });
  });

  const timerModeBtns = document.querySelectorAll('#toggle-timer-mode .toggle-btn');
  timerModeBtns.forEach(btn => {
    if (btn.dataset.mode === settings.timerMode) btn.classList.add('active');
    btn.addEventListener('click', () => {
      timerModeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Storage.saveSettings({ timerMode: btn.dataset.mode });
    });
  });

  updateSettingsUI();

  const langBtns = document.querySelectorAll('#toggle-language .toggle-btn');
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
      Storage.saveSettings({ language: lang });
      updateSettingsUI();
    });
  });

  // Reset Data
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm(t('confirmResetText'))) {
      Storage.resetAllData();
      window.location.reload();
    }
  });
}

function updateSettingsUI() {
  const lang = getLanguage();
  document.querySelectorAll('#toggle-language .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function initModals() {
  // Warning (1st leave)
  document.getElementById('btn-warning-ok').addEventListener('click', () => {
    document.getElementById('modal-warning').classList.remove('active');
    if (currentSession) currentSession.resume();
  });

  // Reset (2nd leave)
  document.getElementById('btn-reset-ok').addEventListener('click', () => {
    document.getElementById('modal-reset').classList.remove('active');
    exitFocusMode();
  });

  // Session Complete
  document.getElementById('btn-complete-ok').addEventListener('click', () => {
    document.getElementById('modal-complete').classList.remove('active');
    exitFocusMode();
  });

  // Add Reward Modal
  document.getElementById('btn-add-reward').addEventListener('click', Rewards.openAddRewardModal);
  
  document.getElementById('btn-reward-cancel').addEventListener('click', () => {
    document.getElementById('modal-reward').classList.remove('active');
  });

  document.getElementById('btn-reward-save').addEventListener('click', () => {
    if (Rewards.saveRewardFromModal()) {
      document.getElementById('modal-reward').classList.remove('active');
    } else {
      // Simple flash effect for invalid form
      document.getElementById('modal-reward').querySelector('.modal-card').style.animation = 'pulse-glow 0.5s';
    }
  });

  // Emoji picker logic
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Confirm Delete
  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    Rewards.cancelDelete();
    document.getElementById('modal-confirm').classList.remove('active');
  });

  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    Rewards.confirmDelete();
    document.getElementById('modal-confirm').classList.remove('active');
  });

  // Celebration
  document.getElementById('btn-celebration-ok').addEventListener('click', () => {
    document.getElementById('modal-celebration').classList.remove('active');
  });
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);
