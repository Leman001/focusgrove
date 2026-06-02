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
let treeInstance = null;
let isFocusModeActive = false;
let selectedDuration = 25; // module-level so dial rotation + chip both write here

// ---- Initialization ----

async function initApp() {
  const settings = Storage.getSettings();
  initI18n(settings.language);

  // Set today's date on dashboard
  const dateEl = document.getElementById('dash-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  updateDashboardStats();
  initNavigation();
  initSettings(settings);
  initFocusStart();
  initDialRotation();
  initModals();
  initOnboarding();

  Rewards.setBalanceChangeCallback(() => {
    updateDashboardStats();
    if (document.getElementById('screen-rewards').classList.contains('active')) {
      Rewards.renderRewardsList(document.getElementById('rewards-list'));
      Rewards.renderHistory(document.getElementById('rewards-history'));
    }
  });

  // Preload tree module silently
  try {
    const { FocusTree } = await import('./tree.js');
    treeInstance = new FocusTree('tree-container');
    treeInstance.init();
    const canvas = document.querySelector('#tree-container canvas');
    if (canvas) canvas.style.opacity = '0';
  } catch (e) {
    console.warn('Failed to preload tree.js', e);
  }
}

// ---- Navigation ----

function initNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isFocusModeActive && btn.dataset.screen !== 'focus') return;
      switchScreen(btn.dataset.screen);
    });
  });

  // Hidden lang button (kept for compatibility, actual lang toggle is in settings)
  const btnLang = document.getElementById('btn-lang');
  if (btnLang) {
    btnLang.addEventListener('click', () => {
      const newLang = getLanguage() === 'ru' ? 'en' : 'ru';
      setLanguage(newLang);
      Storage.saveSettings({ language: newLang });
      updateDashboardStats();
      updateSettingsUI();
    });
  }
}

function switchScreen(screenId) {
  appScreens.forEach(s => s.classList.remove('active'));
  navButtons.forEach(b => b.classList.remove('active'));

  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) targetScreen.classList.add('active');

  const targetNav = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
  if (targetNav) targetNav.classList.add('active');

  if (screenId === 'rewards') {
    Rewards.renderRewardsList(document.getElementById('rewards-list'));
    Rewards.renderHistory(document.getElementById('rewards-history'));
    document.getElementById('rewards-balance').textContent = Storage.getAvailableBalance();
  } else if (screenId === 'dashboard') {
    updateDashboardStats();
  } else if (screenId === 'settings') {
    const streakLine = document.getElementById('settings-streak-line');
    if (streakLine) {
      const s = Storage.getStreak();
      streakLine.textContent = `Focused ${s} ${s === 1 ? 'day' : 'days'} in a row`;
    }
  }
}

// ---- Dashboard ----

function updateDashboardStats() {
  const totalMins = Storage.getTotalFocusMinutes();
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  document.getElementById('stat-total-hours').textContent =
    hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  document.getElementById('stat-streak').textContent = Storage.getStreak() + 'd';
  document.getElementById('stat-balance').textContent = Storage.getAvailableBalance();
  const balanceBadge = document.getElementById('rewards-balance');
  if (balanceBadge) balanceBadge.textContent = Storage.getAvailableBalance();
}

// ---- Dial rendering ----

function drawDialTicks(el, frac) {
  const svg = el.querySelector('.dial-ticks');
  if (!svg) return;
  const N = 116, on = Math.round(frac * N), cx = 50, cy = 50, rOut = 46;
  let out = '';
  for (let i = 0; i < N; i++) {
    const a = (-90 + i / N * 360) * Math.PI / 180;
    const maj = i % Math.floor(N / 12) === 0;
    const len = maj ? 5 : 2.8;
    const r1 = rOut - len;
    const x1 = cx + r1 * Math.cos(a), y1 = cy + r1 * Math.sin(a);
    const x2 = cx + rOut * Math.cos(a), y2 = cy + rOut * Math.sin(a);
    const active = i < on;
    const col = active ? '#ff6a2b' : (maj ? '#b9b3a6' : '#cfc9bd');
    const w = maj ? 1.6 : 1;
    const op = active ? 1 : (maj ? 0.9 : 0.7);
    out += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  }
  svg.innerHTML = out;
}

let _lastDialMinutes = -1;

function updateDialDisplay(minutes) {
  const dialDisplay = document.getElementById('dial-display');
  const chipLabel = document.getElementById('dial-chip-label');
  const dialEl = document.getElementById('dash-dial');
  if (dialDisplay) dialDisplay.textContent = minutes;
  if (chipLabel) chipLabel.textContent = `${String(minutes).padStart(2, '0')}:00`;
  if (dialEl) drawDialTicks(dialEl, Math.min(1, minutes / 120));

  // Visual feedback: pulse the center number when value changes during drag
  if (minutes !== _lastDialMinutes && _lastDialMinutes !== -1) {
    const center = dialEl?.querySelector('.dial-center');
    if (center) {
      center.style.transition = 'transform 0.08s ease-out';
      center.style.transform = 'scale(1.06)';
      setTimeout(() => {
        center.style.transform = 'scale(1)';
      }, 80);
    }
    // Haptic feedback on supported devices
    if (navigator.vibrate) navigator.vibrate(4);
  }
  _lastDialMinutes = minutes;
}

// ---- Focus Start ----

function initFocusStart() {
  const durationBtns = document.querySelectorAll('.duration-btn');
  const customInput = document.getElementById('duration-custom');
  const startBtn = document.getElementById('btn-start-focus');

  const presets = [25, 45, 60, 90, 120];
  // Initialise from saved settings
  const saved = Storage.getSettings().defaultDuration || 25;
  selectedDuration = Math.max(1, Math.min(120, saved));
  let chipIdx = presets.indexOf(selectedDuration);
  if (chipIdx === -1) chipIdx = 0;

  updateDialDisplay(selectedDuration);

  // Chip cycles through presets
  const chipBtn = document.getElementById('duration-chip-btn');
  if (chipBtn) {
    chipBtn.addEventListener('click', () => {
      chipIdx = (chipIdx + 1) % presets.length;
      selectedDuration = presets[chipIdx];
      durationBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.duration) === selectedDuration));
      if (customInput) customInput.value = '';
      updateDialDisplay(selectedDuration);
    });
  }

  if (customInput) {
    customInput.addEventListener('input', () => {
      if (customInput.value) {
        const v = parseInt(customInput.value, 10);
        if (v >= 1) {
          selectedDuration = v;
          updateDialDisplay(selectedDuration);
        }
      }
    });
  }

  startBtn.addEventListener('click', () => {
    if (selectedDuration >= 1) startFocusSession(selectedDuration);
  });
}

// ---- Dial Rotation ----

function initDialRotation() {
  const dialEl = document.getElementById('dash-dial');
  if (!dialEl) return;

  // Make dial feel interactive
  dialEl.style.cursor = 'grab';
  dialEl.style.userSelect = 'none';
  dialEl.style.touchAction = 'none';

  let dragging = false;
  let lastAngle = 0;
  let fractionalMinutes = selectedDuration; // tracks sub-integer for smooth dragging

  function angleFromEvent(e, rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    // Angle from top (12 o'clock), clockwise positive, 0-360°
    return (Math.atan2(clientX - cx, -(clientY - cy)) * 180 / Math.PI + 360) % 360;
  }

  function onStart(e) {
    e.preventDefault();
    dragging = true;
    fractionalMinutes = selectedDuration;
    dialEl.style.cursor = 'grabbing';
    const rect = dialEl.getBoundingClientRect();
    lastAngle = angleFromEvent(e, rect);
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const rect = dialEl.getBoundingClientRect();
    const angle = angleFromEvent(e, rect);

    let delta = angle - lastAngle;
    // Wrap-around correction
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    // 360° = 120 minutes
    fractionalMinutes += delta / 360 * 120;
    fractionalMinutes = Math.max(1, Math.min(120, fractionalMinutes));
    selectedDuration = Math.round(fractionalMinutes);

    lastAngle = angle;
    updateDialDisplay(selectedDuration);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    dialEl.style.cursor = 'grab';
    fractionalMinutes = selectedDuration; // snap to integer
    updateDialDisplay(selectedDuration);
  }

  dialEl.addEventListener('mousedown', onStart);
  dialEl.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}

// ---- Focus Session Logic ----

async function startFocusSession(minutes) {
  isFocusModeActive = true;
  switchScreen('focus');
  bottomNav.classList.add('nav-hidden');

  const settings = Storage.getSettings();

  // Update session target display
  document.getElementById('session-target-value').textContent = `of ${String(minutes).padStart(2, '0')}:00`;

  // Earning display
  const earningEl = document.getElementById('earning-display');
  if (earningEl) earningEl.textContent = `+${minutes} min`;

  // Sync focus-mode-seg with current timer mode
  const focusSegSpans = document.querySelectorAll('#focus-mode-seg span');
  focusSegSpans.forEach(s => s.classList.toggle('on', s.dataset.mode === settings.timerMode));

  // Focus mode segmented control
  focusSegSpans.forEach(span => {
    span.addEventListener('click', () => {
      focusSegSpans.forEach(s => s.classList.remove('on'));
      span.classList.add('on');
      const newMode = span.dataset.mode;
      if (currentSession) currentSession.setMode(newMode);
      Storage.saveSettings({ timerMode: newMode });
      // Sync hidden toggle for legacy compat
      document.getElementById('timer-mode-icon').textContent = newMode === 'countdown' ? '↓' : '↑';
    });
  });

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
      if (treeInstance) treeInstance.setProgress(progress);
    },
    onComplete: () => handleSessionComplete(true, minutes),
    onPause: () => {},
  });

  // Setup Visibility Monitor
  visibilityMonitor = new VisibilityMonitor({
    onFirstLeave: () => {
      currentSession.pause();
      document.getElementById('modal-warning').classList.add('active');
    },
    onSecondLeave: () => handleSessionReset(),
    onReturn: () => {},
  });

  currentSession.start();
  visibilityMonitor.start();

  // Pause / Resume button
  const btnPause = document.getElementById('btn-pause-focus');
  if (btnPause) {
    btnPause.textContent = 'Pause';
    btnPause.onclick = () => {
      if (currentSession.paused) {
        currentSession.resume();
        btnPause.textContent = 'Pause';
      } else {
        currentSession.pause();
        btnPause.textContent = 'Resume';
      }
    };
  }

  // End early button
  document.getElementById('btn-end-focus').onclick = () => {
    const elapsedMinutes = Math.floor(currentSession.getElapsed() / 60);
    handleSessionComplete(false, elapsedMinutes);
  };

  // Hidden legacy timer mode button sync
  document.getElementById('timer-mode-icon').textContent = settings.timerMode === 'countdown' ? '↓' : '↑';
  document.getElementById('btn-timer-mode').onclick = () => {
    const newMode = currentSession.mode === 'countdown' ? 'countup' : 'countdown';
    currentSession.setMode(newMode);
    Storage.saveSettings({ timerMode: newMode });
  };
}

function handleSessionComplete(isFull, earnedMinutes) {
  cleanupFocusSession();
  if (earnedMinutes > 0) {
    Storage.saveSession({ duration: earnedMinutes * 60, targetMinutes: earnedMinutes, completed: isFull });
    document.getElementById('complete-minutes').textContent = earnedMinutes;
    document.getElementById('complete-text').textContent = t('sessionCompleteText');
    document.getElementById('modal-complete').classList.add('active');
  } else {
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
  if (treeInstance) treeInstance.setProgress(0);
  updateDashboardStats();
  switchScreen('dashboard');
}

// ---- Onboarding ----

function initOnboarding() {
  const sessions = Storage.getSessions();
  if (sessions.length > 0) return; // not first time

  // Replace "Ready to focus?" with welcome message
  const h1 = document.querySelector('.dash-header .fg-h1');
  if (h1) h1.textContent = 'Welcome to FocusGrove!';

  // Show a subtle hint below the dial
  const dialHero = document.querySelector('.dial-hero');
  if (dialHero) {
    const hint = document.createElement('div');
    hint.className = 'onboarding-hint';
    hint.innerHTML = '<span style="font-size:14px;color:var(--ink-soft);text-align:center;line-height:1.4;">Rotate the dial to set your time<br>then tap <b>Start Focus</b></span>';
    dialHero.appendChild(hint);
  }
}

// ---- Settings & Modals ----

function initSettings(settings) {
  const sDuration = document.getElementById('setting-duration');
  sDuration.value = settings.defaultDuration;
  sDuration.addEventListener('change', () => {
    Storage.saveSettings({ defaultDuration: parseInt(sDuration.value) });
  });

  // Timer mode segmented (spans with toggle-btn class)
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

  // Wipe all data
  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Wipe all focus data? This cannot be undone.')) {
      Storage.resetAllData();
      window.location.reload();
    }
  });

  // Strict mode toggle (visual only — behaviour handled by VisibilityMonitor)
  const strictToggle = document.getElementById('strict-toggle');
  if (strictToggle) {
    strictToggle.addEventListener('click', () => {
      strictToggle.classList.toggle('on');
      strictToggle.classList.toggle('off');
    });
    // Initialise to 'on' state
    strictToggle.classList.add('on');
  }
}

function updateSettingsUI() {
  const lang = getLanguage();
  document.querySelectorAll('#toggle-language .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function initModals() {
  document.getElementById('btn-warning-ok').addEventListener('click', () => {
    document.getElementById('modal-warning').classList.remove('active');
    if (currentSession) currentSession.resume();
    const btnPause = document.getElementById('btn-pause-focus');
    if (btnPause) btnPause.textContent = 'Pause';
  });

  document.getElementById('btn-reset-ok').addEventListener('click', () => {
    document.getElementById('modal-reset').classList.remove('active');
    exitFocusMode();
  });

  document.getElementById('btn-complete-ok').addEventListener('click', () => {
    document.getElementById('modal-complete').classList.remove('active');
    exitFocusMode();
  });

  document.getElementById('btn-add-reward').addEventListener('click', Rewards.openAddRewardModal);

  document.getElementById('btn-reward-cancel').addEventListener('click', () => {
    document.getElementById('modal-reward').classList.remove('active');
  });

  document.getElementById('btn-reward-save').addEventListener('click', () => {
    if (Rewards.saveRewardFromModal()) {
      document.getElementById('modal-reward').classList.remove('active');
    }
  });

  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    Rewards.cancelDelete();
    document.getElementById('modal-confirm').classList.remove('active');
  });

  document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    Rewards.confirmDelete();
    document.getElementById('modal-confirm').classList.remove('active');
  });

  document.getElementById('btn-celebration-ok').addEventListener('click', () => {
    document.getElementById('modal-celebration').classList.remove('active');
  });
}

document.addEventListener('DOMContentLoaded', initApp);
