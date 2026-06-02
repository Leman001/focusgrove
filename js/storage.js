// FocusGrove — Storage Module
// LocalStorage wrapper for sessions, rewards, settings, and history

const KEYS = {
  sessions: 'focusgrove_sessions',
  rewards: 'focusgrove_rewards',
  claimed: 'focusgrove_claimed',
  settings: 'focusgrove_settings',
};

// ---- Helpers ----

function load(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Settings ----

const DEFAULT_SETTINGS = {
  language: 'en',
  defaultDuration: 45,
  timerMode: 'countdown', // 'countdown' | 'countup'
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load(KEYS.settings) };
}

export function saveSettings(settings) {
  save(KEYS.settings, { ...getSettings(), ...settings });
}

// ---- Sessions ----

export function getSessions() {
  return load(KEYS.sessions) || [];
}

export function saveSession(session) {
  const sessions = getSessions();
  sessions.push({
    id: generateId(),
    date: new Date().toISOString(),
    duration: session.duration, // in seconds
    durationMinutes: Math.floor(session.duration / 60),
    targetMinutes: session.targetMinutes,
    completed: session.completed,
  });
  save(KEYS.sessions, sessions);
}

export function getTotalFocusMinutes() {
  const sessions = getSessions();
  return sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
}

export function getTotalFocusHours() {
  return Math.floor(getTotalFocusMinutes() / 60 * 10) / 10; // 1 decimal
}

export function getStreak() {
  const sessions = getSessions();
  if (sessions.length === 0) return 0;

  // Group sessions by date (YYYY-MM-DD)
  const dates = new Set(
    sessions.map(s => new Date(s.date).toISOString().split('T')[0])
  );

  const sortedDates = [...dates].sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Streak must include today or yesterday
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const curr = new Date(sortedDates[i]);
    const prev = new Date(sortedDates[i + 1]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ---- Rewards ----

export function getRewards() {
  return load(KEYS.rewards) || [];
}

export function saveReward(reward) {
  const rewards = getRewards();
  const existing = rewards.findIndex(r => r.id === reward.id);
  if (existing >= 0) {
    rewards[existing] = { ...rewards[existing], ...reward };
  } else {
    rewards.push({
      id: generateId(),
      emoji: reward.emoji || '🎬',
      name: reward.name,
      cost: reward.cost, // in minutes
      createdAt: new Date().toISOString(),
    });
  }
  save(KEYS.rewards, rewards);
}

export function deleteReward(id) {
  const rewards = getRewards().filter(r => r.id !== id);
  save(KEYS.rewards, rewards);
}

// ---- Claimed Rewards ----

export function getClaimedRewards() {
  return load(KEYS.claimed) || [];
}

export function claimReward(rewardId) {
  const rewards = getRewards();
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) return false;

  const balance = getAvailableBalance();
  if (balance < reward.cost) return false;

  const claimed = getClaimedRewards();
  claimed.push({
    id: generateId(),
    rewardId: reward.id,
    rewardName: reward.name,
    rewardEmoji: reward.emoji,
    cost: reward.cost,
    date: new Date().toISOString(),
  });
  save(KEYS.claimed, claimed);
  return true;
}

export function getSpentMinutes() {
  const claimed = getClaimedRewards();
  return claimed.reduce((sum, c) => sum + (c.cost || 0), 0);
}

export function getAvailableBalance() {
  return getTotalFocusMinutes() - getSpentMinutes();
}

// ---- Reset ----

export function resetAllData() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

// ---- Export for debug ----

export function exportData() {
  return {
    sessions: getSessions(),
    rewards: getRewards(),
    claimed: getClaimedRewards(),
    settings: getSettings(),
  };
}
