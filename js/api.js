// FocusGrove — API Client
// Wraps all backend endpoints. Falls back to local mock if server unreachable.

const BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ── User & Stats ─────────────────────────────────────────────────────────────

export async function getMe() {
  return request('GET', '/me');
}

export async function getStats() {
  return request('GET', '/stats');
}

// ── Rewards ──────────────────────────────────────────────────────────────────

export async function getRewards() {
  return request('GET', '/rewards');
}

export async function createReward({ emoji, name, costMinutes, badge }) {
  return request('POST', '/rewards', { emoji, name, costMinutes, badge });
}

export async function deleteReward(id) {
  return request('DELETE', `/rewards/${id}`);
}

export async function claimReward(id) {
  return request('POST', `/rewards/${id}/claim`);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function startSession({ durationMinutes, mode, ambientTrack }) {
  return request('POST', '/sessions', { durationMinutes, mode, ambientTrack });
}

export async function completeSession(sessionId) {
  return request('POST', `/sessions/${sessionId}/complete`);
}

export async function abortSession(sessionId) {
  return request('POST', `/sessions/${sessionId}/abort`);
}

// ── History ──────────────────────────────────────────────────────────────────

export async function getHistory(limit = 20) {
  return request('GET', `/history?limit=${limit}`);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function patchSettings(settings) {
  return request('PATCH', '/settings', settings);
}

// ── Danger Zone ──────────────────────────────────────────────────────────────

export async function wipeAllData() {
  return request('DELETE', '/me/data');
}
