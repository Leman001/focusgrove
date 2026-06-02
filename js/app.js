// FocusGrove v2 — Main Application (API-backed)

import * as API from './api.js';
import { FocusTimer } from './timer.js';
import { VisibilityMonitor } from './visibility.js';

// ── Elements ────────────────────────────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const appScreens = $$('.screen');
const navButtons = $$('.nav-btn');
const bottomNav = $('#bottom-nav');

// ── State ───────────────────────────────────────────────────────────────────

let me = null;            // /api/me response
let rewards = [];         // /api/rewards response
let currentSession = null;
let currentSessionId = null;
let visibilityMonitor = null;
let treeInstance = null;
let isFocusModeActive = false;
let selectedDuration = 25;

// ── Init ────────────────────────────────────────────────────────────────────

async function initApp() {
  try {
    me = await API.getMe();
    rewards = await API.getRewards();
  } catch (e) {
    console.warn('API unavailable, using defaults', e);
    me = { id: 1, name: 'User', balanceMinutes: 0, dayStreak: 0,
      settings: { defaultDurationMinutes: 25, defaultMode: 'countdown', language: 'en', strictMode: true },
      todayFocusMinutes: 0, weekFocusMinutes: 0, dailyAvgMinutes: 0, totalFocusHours: 0, weeklyBars: [0,0,0,0,0,0,0] };
    rewards = [];
  }

  selectedDuration = me.settings.defaultDurationMinutes || 25;

  renderDashboard();
  renderRewards();
  initNavigation();
  initSettings();
  initFocusStart();
  initModals();

  // Preload tree
  try {
    const { FocusTree } = await import('./tree.js');
    treeInstance = new FocusTree('tree-container');
    treeInstance.init();
    const canvas = $('#tree-container canvas');
    if (canvas) canvas.style.opacity = '0';
  } catch (e) {
    console.warn('Tree preload failed', e);
  }
}

// ── Navigation ──────────────────────────────────────────────────────────────

function initNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isFocusModeActive && btn.dataset.screen !== 'focus') return;
      switchScreen(btn.dataset.screen);
    });
  });
}

function switchScreen(screenId) {
  appScreens.forEach(s => s.classList.remove('active'));
  navButtons.forEach(b => b.classList.remove('active'));
  $(`#screen-${screenId}`)?.classList.add('active');
  $(`.nav-btn[data-screen="${screenId}"]`)?.classList.add('active');

  if (screenId === 'rewards') refreshRewards();
  if (screenId === 'settings') renderSettings();
  if (screenId === 'dashboard') refreshDashboard();
}

// ── Dashboard A ─────────────────────────────────────────────────────────────

function renderDashboard() {
  if (!me) return;
  $('#dash-username').textContent = me.name;
  $('#stat-total').textContent = me.totalFocusHours.toLocaleString();
  $('#stat-streak').textContent = me.dayStreak;
  $('#stat-balance-chip').textContent = me.balanceMinutes.toLocaleString();

  const todayH = Math.floor(me.todayFocusMinutes / 60);
  const todayM = me.todayFocusMinutes % 60;
  $('#stat-today').textContent = `${todayH}h`;
  $('#stat-today-m').textContent = `${todayM}m`;

  const weekH = Math.floor(me.weekFocusMinutes / 60);
  const weekM = me.weekFocusMinutes % 60;
  $('#stat-week').textContent = `${weekH}h`;
  $('#stat-week-m').textContent = `${weekM}m`;

  const avgH = Math.floor(me.dailyAvgMinutes / 60);
  const avgM = me.dailyAvgMinutes % 60;
  $('#stat-avg').innerHTML = `${avgH}h <span style="font-size:14px;color:var(--ink-mute)">${avgM}m</span>`;

  // Weekly bars
  const barsEl = $('#weekly-bars');
  const colors = ['var(--c-blue)','var(--accent)','var(--c-green)','var(--c-yellow)','var(--c-violet)','var(--accent)','var(--c-blue)'];
  barsEl.innerHTML = (me.weeklyBars || [0,0,0,0,0,0,0]).map((v, i) =>
    `<div class="bar" style="width:6px;height:${Math.max(8, v * 44)}px;background:${colors[i]}"></div>`
  ).join('');

  // Duration chip
  updateChipLabel();
}

async function refreshDashboard() {
  try { me = await API.getMe(); renderDashboard(); } catch (e) { console.warn(e); }
}

function updateChipLabel() {
  const el = $('#dial-chip-label');
  if (el) el.textContent = `${String(selectedDuration).padStart(2, '0')}:00`;
}

// ── Focus Start ─────────────────────────────────────────────────────────────

function initFocusStart() {
  const presets = [25, 45, 60, 90];
  let idx = presets.indexOf(selectedDuration);
  if (idx === -1) idx = 0;

  // Chip cycles presets
  $('#duration-chip-btn')?.addEventListener('click', () => {
    idx = (idx + 1) % presets.length;
    selectedDuration = presets[idx];
    updateChipLabel();
  });

  $('#btn-start-focus')?.addEventListener('click', () => {
    if (selectedDuration >= 1) startFocusSession(selectedDuration);
  });
}

// ── Focus Session ───────────────────────────────────────────────────────────

async function startFocusSession(minutes) {
  isFocusModeActive = true;
  switchScreen('focus');
  bottomNav.classList.add('nav-hidden');

  const mode = me?.settings?.defaultMode || 'countdown';

  // Start session on backend
  try {
    const res = await API.startSession({ durationMinutes: minutes, mode });
    currentSessionId = res.id;
  } catch (e) {
    console.warn('Failed to start session on server', e);
    currentSessionId = null;
  }

  // Update focus mode seg
  $$('#focus-mode-seg span').forEach(s => s.classList.toggle('on', s.dataset.mode === mode));

  // Focus mode seg click handler
  $$('#focus-mode-seg span').forEach(span => {
    span.onclick = () => {
      $$('#focus-mode-seg span').forEach(s => s.classList.remove('on'));
      span.classList.add('on');
      if (currentSession) currentSession.setMode(span.dataset.mode);
    };
  });

  // Show tree
  if (treeInstance) {
    const canvas = $('#tree-container canvas');
    if (canvas) { canvas.style.transition = 'opacity 1s'; canvas.style.opacity = '1'; }
  }
  $('#tree-loading').style.display = 'none';

  // Timer
  const durationSec = minutes * 60;
  currentSession = new FocusTimer({
    duration: durationSec,
    mode,
    onTick: (elapsed, remaining, progress) => {
      $('#timer-value').textContent = currentSession.getDisplayTime();
      const minsLeft = Math.ceil(remaining / 60);
      $('#focus-caption').textContent = minsLeft > 0 ? `${minsLeft} minute${minsLeft !== 1 ? 's' : ''} to bloom` : 'Blooming!';
      if (treeInstance) treeInstance.setProgress(progress);
    },
    onComplete: () => handleSessionComplete(true, minutes),
    onPause: () => {},
  });

  // Visibility monitor (strict mode)
  visibilityMonitor = new VisibilityMonitor({
    onFirstLeave: () => {
      currentSession.pause();
      $('#modal-warning').classList.add('active');
    },
    onSecondLeave: () => handleSessionReset(),
    onReturn: () => {},
  });

  currentSession.start();
  visibilityMonitor.start();
}

async function handleSessionComplete(isFull, earnedMinutes) {
  cleanupFocusSession();
  if (earnedMinutes > 0 && currentSessionId) {
    try {
      const res = await API.completeSession(currentSessionId);
      earnedMinutes = res.earnedMinutes;
    } catch (e) { console.warn(e); }
  }
  if (earnedMinutes > 0) {
    $('#complete-minutes').textContent = `+${earnedMinutes} min`;
    $('#modal-complete').classList.add('active');
  } else {
    exitFocusMode();
  }
}

function handleSessionReset() {
  cleanupFocusSession();
  if (currentSessionId) API.abortSession(currentSessionId).catch(() => {});
  $('#modal-warning').classList.remove('active');
  $('#modal-reset').classList.add('active');
}

function cleanupFocusSession() {
  if (currentSession) currentSession.stop();
  if (visibilityMonitor) visibilityMonitor.stop();
}

function exitFocusMode() {
  isFocusModeActive = false;
  bottomNav.classList.remove('nav-hidden');
  if (treeInstance) treeInstance.setProgress(0);
  currentSessionId = null;
  switchScreen('dashboard');
}

// ── Rewards ─────────────────────────────────────────────────────────────────

function renderRewards() {
  const container = $('#rewards-list');
  $('#rewards-balance').textContent = (me?.balanceMinutes || 0).toLocaleString();
  const bal = me?.balanceMinutes || 0;

  if (!rewards.length) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:var(--ink-mute)">
      <div style="font-size:32px;margin-bottom:8px">🎁</div>
      <div style="font-size:15px;font-weight:600">No rewards yet</div>
      <div style="font-size:13px;margin-top:4px">Tap + New to create your first</div>
    </div>`;
    return;
  }

  const tints = { '☕': '#efe0cf', '🎮': '#d6e6d8', '🍿': '#e2dcf0', '🛍️': '#f4ddd4', '🌴': '#cfe2e8', '📚': '#e0dce8' };

  container.innerHTML = rewards.map(r => {
    const afford = bal >= r.costMinutes;
    const tint = tints[r.emoji] || '#e8e2d9';
    return `
      <div class="fg-card catalog-card" data-id="${r.id}">
        <div class="card-img" style="background:radial-gradient(120% 120% at 38% 30%, #fff, ${tint})">
          <span class="emoji">${r.emoji}</span>
          ${r.badge ? `<div class="fg-tag" style="position:absolute;top:10px;right:10px;height:24px;font-size:11px">${r.badge}</div>` : ''}
          <button class="reward-delete-btn" data-id="${r.id}" style="position:absolute;top:10px;left:10px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,.15);color:#fff;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <div class="card-body">
          <div class="card-name">${r.name}</div>
          <div class="card-footer">
            <span class="fg-num card-price">${r.costMinutes} <span class="unit">min</span></span>
            <button class="btn-claim ${afford ? 'can-claim' : 'locked'}" data-id="${r.id}" ${!afford ? 'disabled' : ''}>
              ${afford ? 'Claim' : `Need ${r.costMinutes - bal}`}
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Events
  container.querySelectorAll('.btn-claim.can-claim').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); handleClaimReward(btn.dataset.id); });
  });
  container.querySelectorAll('.reward-delete-btn').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); handleDeleteReward(btn.dataset.id); });
  });
}

async function refreshRewards() {
  try {
    [me, rewards] = await Promise.all([API.getMe(), API.getRewards()]);
    renderRewards();
  } catch (e) { console.warn(e); }
}

async function handleClaimReward(id) {
  const reward = rewards.find(r => r.id === id);
  if (!reward) return;
  try {
    const res = await API.claimReward(id);
    // Show celebration
    $('#celebration-emoji').textContent = reward.emoji;
    $('#celebration-text').innerHTML = `Enjoy your <b style="color:var(--ink)">${reward.name}</b>. You earned every minute of it.`;
    $('#celebration-balance').innerHTML = `${res.balanceMinutes.toLocaleString()} <span style="font-size:15px;color:var(--ink-mute)">min</span>`;
    $('#modal-celebration').classList.add('active');
    // Create confetti
    createConfetti();
    me.balanceMinutes = res.balanceMinutes;
    renderRewards();
  } catch (e) {
    alert(e.message);
  }
}

let pendingDeleteId = null;
function handleDeleteReward(id) {
  const reward = rewards.find(r => r.id === id);
  pendingDeleteId = id;
  $('#confirm-title').textContent = 'Delete this reward?';
  $('#confirm-text').textContent = `"${reward?.name}" will be removed. This can't be undone.`;
  $('#modal-confirm').classList.add('active');
}

function createConfetti() {
  const container = $('#confetti');
  container.innerHTML = '';
  const cols = ['#ff6a2b', '#4f7dff', '#3fb37a', '#f4b740', '#8b7bff'];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*70}%;background:${cols[i%5]};transform:rotate(${Math.random()*360}deg)`;
    container.appendChild(piece);
  }
  setTimeout(() => container.innerHTML = '', 3000);
}

// ── Settings ────────────────────────────────────────────────────────────────

function renderSettings() {
  if (!me) return;
  $('#settings-name').textContent = me.name;
  const s = me.dayStreak;
  $('#settings-streak-line').textContent = `Focused ${s} ${s === 1 ? 'day' : 'days'} in a row`;
  $('#setting-duration').value = me.settings.defaultDurationMinutes;

  $$('#toggle-timer-mode button').forEach(b => b.classList.toggle('active', b.dataset.mode === me.settings.defaultMode));
  $$('#toggle-language button').forEach(b => b.classList.toggle('active', b.dataset.lang === me.settings.language));

  const strict = $('#strict-toggle');
  strict.classList.toggle('on', me.settings.strictMode);
  strict.classList.toggle('off', !me.settings.strictMode);
}

function initSettings() {
  renderSettings();

  $('#setting-duration')?.addEventListener('change', async (e) => {
    const v = parseInt(e.target.value);
    await API.patchSettings({ defaultDurationMinutes: v }).catch(() => {});
    if (me) me.settings.defaultDurationMinutes = v;
    selectedDuration = v;
    updateChipLabel();
  });

  $$('#toggle-timer-mode button').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('#toggle-timer-mode button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await API.patchSettings({ defaultMode: btn.dataset.mode }).catch(() => {});
      if (me) me.settings.defaultMode = btn.dataset.mode;
    });
  });

  $$('#toggle-language button').forEach(btn => {
    btn.addEventListener('click', async () => {
      $$('#toggle-language button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await API.patchSettings({ language: btn.dataset.lang }).catch(() => {});
      if (me) me.settings.language = btn.dataset.lang;
    });
  });

  $('#strict-toggle')?.addEventListener('click', async () => {
    const toggle = $('#strict-toggle');
    const isOn = toggle.classList.contains('on');
    toggle.classList.toggle('on', !isOn);
    toggle.classList.toggle('off', isOn);
    await API.patchSettings({ strictMode: !isOn }).catch(() => {});
    if (me) me.settings.strictMode = !isOn;
  });

  $('#btn-reset-data')?.addEventListener('click', async () => {
    if (confirm('Wipe all focus data? This cannot be undone.')) {
      await API.wipeAllData().catch(() => {});
      window.location.reload();
    }
  });
}

// ── Modals ───────────────────────────────────────────────────────────────────

function initModals() {
  $('#btn-warning-ok')?.addEventListener('click', () => {
    $('#modal-warning').classList.remove('active');
    if (currentSession) currentSession.resume();
  });

  $('#btn-reset-ok')?.addEventListener('click', () => {
    $('#modal-reset').classList.remove('active');
    exitFocusMode();
  });

  $('#btn-complete-ok')?.addEventListener('click', () => {
    $('#modal-complete').classList.remove('active');
    exitFocusMode();
  });

  $('#btn-celebration-ok')?.addEventListener('click', () => {
    $('#modal-celebration').classList.remove('active');
  });

  // Add reward
  $('#btn-add-reward')?.addEventListener('click', openAddRewardModal);
  $('#btn-reward-cancel')?.addEventListener('click', () => $('#modal-reward').classList.remove('active'));

  $('#btn-reward-save')?.addEventListener('click', async () => {
    const name = $('#reward-name').value.trim();
    const cost = parseInt($('#reward-cost').value, 10);
    const emoji = $('.emoji-btn.active')?.dataset?.emoji || '🎁';
    if (!name || !cost || cost <= 0) return;
    try {
      await API.createReward({ emoji, name, costMinutes: cost });
      $('#modal-reward').classList.remove('active');
      refreshRewards();
    } catch (e) { alert(e.message); }
  });

  // Emoji picker
  $$('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('#emoji-preview').textContent = btn.dataset.emoji;
    });
  });

  // Confirm delete
  $('#btn-confirm-cancel')?.addEventListener('click', () => {
    pendingDeleteId = null;
    $('#modal-confirm').classList.remove('active');
  });

  $('#btn-confirm-ok')?.addEventListener('click', async () => {
    if (pendingDeleteId) {
      await API.deleteReward(pendingDeleteId).catch(() => {});
      pendingDeleteId = null;
      $('#modal-confirm').classList.remove('active');
      refreshRewards();
    }
  });
}

function openAddRewardModal() {
  $('#reward-name').value = '';
  $('#reward-cost').value = '';
  $$('.emoji-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  $('#emoji-preview').textContent = '☕';
  $('#modal-reward-title').textContent = 'New reward';
  $('#modal-reward').classList.add('active');
}

// ── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initApp);
