// FocusGrove — Rewards Module
// Handles rendering and interaction for the rewards system

import * as Storage from './storage.js';
import { t, getLanguage } from './i18n.js';

let onBalanceChange = null;

export function setBalanceChangeCallback(cb) {
  onBalanceChange = cb;
}

function notifyBalanceChange() {
  if (onBalanceChange) onBalanceChange();
}

// ---- Render Rewards Grid ----

export function renderRewardsList(container) {
  const rewards = Storage.getRewards();
  const balance = Storage.getAvailableBalance();

  if (rewards.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = rewards.map(reward => {
    const claimable = balance >= reward.cost;
    const missing = Math.max(0, reward.cost - balance);

    return `
      <div class="reward-card ${claimable ? 'claimable' : ''}" data-id="${reward.id}">
        <div class="reward-card-header">
          <span class="reward-emoji">${reward.emoji}</span>
          <button class="reward-delete-btn" data-id="${reward.id}" title="Delete">✕</button>
        </div>
        <div class="reward-name">${escapeHtml(reward.name)}</div>
        <div class="reward-cost">
          <span class="reward-cost-value">${reward.cost}</span>
          <span class="reward-cost-label">${t('costLabel')}</span>
        </div>
        <div class="reward-status" style="margin-bottom: 12px;">
          ${!claimable ? `<span class="reward-missing-text" style="font-size:0.8rem; color:var(--text-secondary);">Осталось накопить: ${missing} ${t('min')}</span>` : ''}
        </div>
        <button class="btn-claim ${!claimable ? 'disabled' : ''}" data-id="${reward.id}" ${!claimable ? 'disabled' : ''} style="${!claimable ? 'background: var(--bg-secondary); color: var(--text-muted); cursor: not-allowed;' : ''}">
          ${t('claim')} ${claimable ? '🎉' : '🔒'}
        </button>
      </div>
    `;
  }).join('');

  // Attach event listeners
  container.querySelectorAll('.btn-claim').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleClaimReward(btn.dataset.id);
    });
  });

  container.querySelectorAll('.reward-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteReward(btn.dataset.id);
    });
  });
}

// ---- Render Mini Preview (Dashboard) ----

export function renderRewardsPreview(container) {
  const rewards = Storage.getRewards();
  const balance = Storage.getAvailableBalance();
  const noRewardsHint = document.getElementById('no-rewards-hint');

  if (rewards.length === 0) {
    container.innerHTML = '';
    if (noRewardsHint) noRewardsHint.style.display = 'block';
    return;
  }

  if (noRewardsHint) noRewardsHint.style.display = 'none';

  // Sort by closest to claimable
  const sorted = [...rewards].sort((a, b) => {
    const progA = balance / a.cost;
    const progB = balance / b.cost;
    // Claimable first, then by progress descending
    if (progA >= 1 && progB < 1) return -1;
    if (progB >= 1 && progA < 1) return 1;
    return progB - progA;
  });

  const top3 = sorted.slice(0, 3);

  container.innerHTML = top3.map(reward => {
    const claimable = balance >= reward.cost;
    const missing = Math.max(0, reward.cost - balance);

    return `
      <div class="reward-mini ${claimable ? 'claimable' : ''}">
        <span class="reward-mini-emoji">${reward.emoji}</span>
        <div class="reward-mini-info">
          <span class="reward-mini-name">${escapeHtml(reward.name)}</span>
          ${!claimable ? `<span class="reward-mini-missing" style="font-size: 0.75rem; color: var(--text-secondary);">Ещё ${missing} ${t('min')}</span>` : `<span class="reward-mini-ready" style="font-size: 0.75rem; color: var(--accent);">Доступно! 🎉</span>`}
        </div>
        <span class="reward-mini-cost">${reward.cost} ${t('min')}</span>
      </div>
    `;
  }).join('');
}

// ---- Render History ----

export function renderHistory(container) {
  const claimed = Storage.getClaimedRewards().reverse(); // newest first
  const noHistoryHint = document.getElementById('no-history-hint');

  if (claimed.length === 0) {
    container.innerHTML = '';
    if (noHistoryHint) noHistoryHint.style.display = 'block';
    return;
  }

  if (noHistoryHint) noHistoryHint.style.display = 'none';

  container.innerHTML = claimed.map(item => {
    const date = new Date(item.date);
    const dateStr = date.toLocaleDateString(getLanguage() === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
      <div class="history-item">
        <span class="history-emoji">${item.rewardEmoji}</span>
        <div class="history-info">
          <span class="history-name">${escapeHtml(item.rewardName)}</span>
          <span class="history-date">${dateStr}</span>
        </div>
        <span class="history-cost">-${item.cost} ${t('min')}</span>
      </div>
    `;
  }).join('');
}

// ---- Claim Reward ----

function handleClaimReward(id) {
  const reward = Storage.getRewards().find(r => r.id === id);
  if (!reward) return;

  const success = Storage.claimReward(id);
  if (success) {
    // Show celebration modal
    showCelebration(reward);
    notifyBalanceChange();
  }
}

function showCelebration(reward) {
  const modal = document.getElementById('modal-celebration');
  const text = document.getElementById('celebration-text');
  
  if (text) {
    text.textContent = `${reward.emoji} ${reward.name}`;
  }

  modal.classList.add('active');

  // Simple confetti effect
  createConfetti();
}

function createConfetti() {
  const container = document.getElementById('confetti');
  if (!container) return;
  container.innerHTML = '';

  const colors = ['#00d4aa', '#e879f9', '#a78bfa', '#3fb950', '#f0f6fc'];
  
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay: ${Math.random() * 0.5}s;
      animation-duration: ${1 + Math.random() * 1.5}s;
    `;
    container.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => {
    container.innerHTML = '';
  }, 3000);
}

// ---- Delete Reward ----

let pendingDeleteId = null;

function handleDeleteReward(id) {
  pendingDeleteId = id;
  const modal = document.getElementById('modal-confirm');
  const title = document.getElementById('confirm-title');
  const text = document.getElementById('confirm-text');
  
  if (title) title.textContent = t('confirmDelete');
  if (text) text.textContent = t('confirmDeleteText');
  
  modal.classList.add('active');
}

export function confirmDelete() {
  if (pendingDeleteId) {
    Storage.deleteReward(pendingDeleteId);
    pendingDeleteId = null;
    notifyBalanceChange();
  }
}

export function cancelDelete() {
  pendingDeleteId = null;
}

// ---- Add/Edit Reward Modal ----

let editingRewardId = null;

export function openAddRewardModal() {
  editingRewardId = null;
  const title = document.getElementById('modal-reward-title');
  if (title) title.textContent = t('newReward');
  
  document.getElementById('reward-name').value = '';
  document.getElementById('reward-cost').value = '';
  
  // Reset emoji selection
  document.querySelectorAll('.emoji-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === 0);
  });
  
  document.getElementById('modal-reward').classList.add('active');
}

export function saveRewardFromModal() {
  const name = document.getElementById('reward-name').value.trim();
  const cost = parseInt(document.getElementById('reward-cost').value, 10);
  const emojiBtn = document.querySelector('.emoji-btn.active');
  const emoji = emojiBtn ? emojiBtn.dataset.emoji : '🎬';

  if (!name || !cost || cost <= 0) return false;

  if (editingRewardId) {
    Storage.saveReward({ id: editingRewardId, name, cost, emoji });
  } else {
    Storage.saveReward({ name, cost, emoji });
  }

  editingRewardId = null;
  notifyBalanceChange();
  return true;
}

// ---- Utils ----

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
