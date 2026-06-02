# FocusGrove — Bug Analysis & Known Issues

This document contains identified bugs, potential issues, and fixes for FocusGrove.

---

## 🔴 CRITICAL BUGS

### Bug #1: Resume After Pause May Have Timing Issues
**Severity:** HIGH  
**File:** `js/timer.js` (Line 48-53)  
**Description:**  
When the timer is paused and resumed, the `_pauseOffset` is correctly saved, but `_startTime` is reset to `Date.now()`. This can cause a jump in elapsed time if the pause duration is significant.

**Current Code:**
```javascript
resume() {
  if (!this.running || !this.paused) return;
  this.paused = false;
  this._startTime = Date.now();  // ⚠️ Resets start time
  this._intervalId = setInterval(() => this._tick(), 1000);
}
```

**Issue:** If paused for 30 seconds, `_startTime` updates to now, but `_pauseOffset` still reflects the paused value, potentially causing `elapsed` to calculate incorrectly.

**Fix:**
```javascript
resume() {
  if (!this.running || !this.paused) return;
  this.paused = false;
  this._startTime = Date.now() - (this._pauseOffset * 1000);  // Adjust for pause offset
  this._intervalId = setInterval(() => this._tick(), 1000);
}
```

**Test:**
```javascript
const timer = new FocusTimer({ duration: 300, mode: 'countdown', onTick: () => {}, onComplete: () => {} });
timer.start();
setTimeout(() => {
  const e1 = timer.elapsed;
  timer.pause();
  setTimeout(() => {
    timer.resume();
    setTimeout(() => {
      const e2 = timer.elapsed;
      console.assert(e2 > e1, 'Elapsed should increase after resume');
      console.assert(e2 <= e1 + 2, 'Should not jump more than 2 seconds');
      timer.stop();
    }, 1100);
  }, 2100);
}, 1100);
```

---

### Bug #2: Visibility Monitor May Not Detect All Tab Switches
**Severity:** HIGH  
**File:** `js/visibility.js` (Line 54-64)  
**Description:**  
The `_handleBlur()` method uses a 100ms setTimeout to check `document.hidden`, but on some mobile browsers or rapid switches, this timeout may not be sufficient or the blur event may fire unreliably.

**Current Code:**
```javascript
_handleBlur() {
  if (!this.active) return;
  
  setTimeout(() => {
    if (document.hidden) {
      this._handleLeave();
    }
  }, 100);  // ⚠️ May be too long or too short
}
```

**Issue:** Some browsers may not set `document.hidden` immediately, or the blur event may not fire on tab switches in certain conditions.

**Fix:**
```javascript
_handleBlur() {
  if (!this.active) return;
  
  // First check immediately
  if (document.hidden) {
    this._handleLeave();
    return;
  }
  
  // Then check again after brief delay
  setTimeout(() => {
    if (document.hidden) {
      this._handleLeave();
    }
  }, 50);
}
```

**Test:**
- Test on Chrome, Firefox, Safari, and mobile browsers
- Rapidly switch tabs and verify detection

---

### Bug #3: Tree Container May Not Resize Properly on Mobile
**Severity:** MEDIUM  
**File:** `js/tree.js` (Line 480-491)  
**Description:**  
The ResizeObserver watches the container, but if the container's parent resizes (e.g., keyboard appears/disappears on mobile), the tree canvas may not update correctly.

**Current Code:**
```javascript
_onResize() {
  if (!this.container || !this.renderer || !this.camera) return;
  const w = this.container.clientWidth, h = this.container.clientHeight || 1;
  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(w, h);
}
```

**Issue:** On mobile, when the virtual keyboard appears/disappears, `clientHeight` may become 0 briefly, and the fallback `|| 1` is applied, causing a massive aspect ratio change and distortion.

**Fix:**
```javascript
_onResize() {
  if (!this.container || !this.renderer || !this.camera) return;
  const w = this.container.clientWidth;
  let h = this.container.clientHeight;
  
  // Prevent zero height on mobile keyboard
  if (h === 0) {
    h = window.innerHeight * 0.6; // Estimated 60% of screen
  }
  
  const aspect = w / h;
  if (aspect < 0.3 || aspect > 3) return; // Sanity check
  
  this.camera.aspect = aspect;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize(w, h);
}
```

---

### Bug #4: Tree.dispose() May Throw on Second Call
**Severity:** MEDIUM  
**File:** `js/tree.js` (Line 100-118)  
**Description:**  
The dispose method doesn't check if resources are already disposed before removing them. Calling dispose twice can cause errors.

**Current Code:**
```javascript
dispose() {
  if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
  if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
  if (this.controls) { this.controls.dispose(); this.controls = null; }
  if (this.renderer) {
    this.renderer.dispose();
    this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);  // ⚠️ May fail if already removed
    this.renderer = null;
  }
  // ...
}
```

**Fix:**
```javascript
dispose() {
  if (this.animId !== null) { cancelAnimationFrame(this.animId); this.animId = null; }
  if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
  if (this.controls) { this.controls.dispose(); this.controls = null; }
  if (this.renderer) {
    this.renderer.dispose();
    try {
      this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);
    } catch (e) {
      console.warn('Canvas already removed:', e);
    }
    this.renderer = null;
  }
  // ...
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### Issue #5: API Fallback May Have Outdated Defaults
**Severity:** MEDIUM  
**File:** `js/app.js` (Line 28-38)  
**Description:**  
When the API is unavailable, hardcoded defaults are used. However, these may not match the current schema if the backend has been updated.

**Current Code:**
```javascript
me = { 
  id: 1, name: 'User', balanceMinutes: 0, dayStreak: 0,
  settings: { defaultDurationMinutes: 25, defaultMode: 'countdown', language: 'en', strictMode: true },
  todayFocusMinutes: 0, weekFocusMinutes: 0, dailyAvgMinutes: 0, totalFocusHours: 0, weeklyBars: [0,0,0,0,0,0,0] 
};
```

**Fix:**
Create a separate `defaults.js` file:
```javascript
// js/defaults.js
export const DEFAULT_USER = {
  id: 1,
  name: 'Focus User',
  balanceMinutes: 0,
  dayStreak: 0,
  settings: {
    defaultDurationMinutes: 25,
    defaultMode: 'countdown',
    language: 'en',
    strictMode: true
  },
  todayFocusMinutes: 0,
  weekFocusMinutes: 0,
  dailyAvgMinutes: 0,
  totalFocusHours: 0,
  weeklyBars: [0,0,0,0,0,0,0]
};
```

Then import and use consistently.

---

### Issue #6: No Error Handling in renderRewards()
**Severity:** MEDIUM  
**File:** `js/app.js` (Line 249-294)  
**Description:**  
If `me` or `rewards` are undefined, rendering fails silently or throws errors.

**Current Code:**
```javascript
function renderRewards() {
  const container = $('#rewards-list');
  $('#rewards-balance').textContent = (me?.balanceMinutes || 0).toLocaleString();  // ✅ Has optional chaining
  const bal = me?.balanceMinutes || 0;
  
  if (!rewards.length) {  // ⚠️ Assumes rewards is defined
    container.innerHTML = `...`;
    return;
  }
  // ...
}
```

**Fix:**
```javascript
function renderRewards() {
  const container = $('#rewards-list');
  if (!container) return console.warn('Rewards container not found');
  
  $('#rewards-balance').textContent = (me?.balanceMinutes || 0).toLocaleString();
  const bal = me?.balanceMinutes || 0;
  
  const rewardsList = rewards || [];
  
  if (!rewardsList.length) {
    container.innerHTML = `<div style="...">No rewards yet</div>`;
    return;
  }
  // ...
}
```

---

### Issue #7: LocalStorage Not Implemented
**Severity:** MEDIUM  
**File:** All modules  
**Description:**  
The app claims to use LocalStorage ("All data stored reliably in LocalStorage"), but the code doesn't show any localStorage.setItem/getItem calls. This means data is lost on page refresh.

**Fix:**
Add localStorage persistence layer:
```javascript
// js/storage.js
export const storage = {
  setUser(user) {
    localStorage.setItem('focusgrove:user', JSON.stringify(user));
  },
  getUser() {
    const data = localStorage.getItem('focusgrove:user');
    return data ? JSON.parse(data) : null;
  },
  setRewards(rewards) {
    localStorage.setItem('focusgrove:rewards', JSON.stringify(rewards));
  },
  getRewards() {
    const data = localStorage.getItem('focusgrove:rewards');
    return data ? JSON.parse(data) : [];
  }
};
```

---

### Issue #8: Confetti Animation May Cause Performance Issues
**Severity:** MEDIUM  
**File:** `js/app.js` (Line 331-342)  
**Description:**  
The confetti animation creates 28 DOM elements, but doesn't clean them up immediately. On low-end devices, this can cause jank.

**Current Code:**
```javascript
function createConfetti() {
  const container = $('#confetti');
  container.innerHTML = '';
  const cols = ['#ff6a2b', '#4f7dff', '#3fb37a', '#f4b740', '#8b7bff'];
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `...`;
    container.appendChild(piece);  // ⚠️ DOM reflow on each append
  }
  setTimeout(() => container.innerHTML = '', 3000);
}
```

**Fix:**
```javascript
function createConfetti() {
  const container = $('#confetti');
  container.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const cols = ['#ff6a2b', '#4f7dff', '#3fb37a', '#f4b740', '#8b7bff'];
  
  for (let i = 0; i < 28; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `left:${Math.random()*100}%;...`;
    fragment.appendChild(piece);
  }
  
  container.appendChild(fragment);  // ✅ Single reflow
  setTimeout(() => container.innerHTML = '', 3000);
}
```

---

## 🟢 LOW SEVERITY ISSUES

### Issue #9: Timer Display May Be Confusing for Long Sessions
**Severity:** LOW  
**File:** `js/timer.js` (Line 105-114)  
**Description:**  
Sessions over 1 hour show H:MM:SS format, but users might expect to see hours more clearly.

**Current Code:**
```javascript
_formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

**Suggestion:**
```javascript
_formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m`;  // More readable
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

---

### Issue #10: No Input Validation for Reward Cost
**Severity:** LOW  
**File:** `js/app.js` (Line 433-443)  
**Description:**  
Users can create rewards with 0 or negative cost (if they bypass the HTML input validation).

**Current Code:**
```javascript
$('#btn-reward-save')?.addEventListener('click', async () => {
  const name = $('#reward-name').value.trim();
  const cost = parseInt($('#reward-cost').value, 10);
  const emoji = $('.emoji-btn.active')?.data?.emoji || '🎁';
  if (!name || !cost || cost <= 0) return;  // ✅ Has validation
  // ...
});
```

**Status:** Actually OK, validation is present. No change needed.

---

## 📋 RECOMMENDED IMPROVEMENTS

### Improvement #1: Add Error Boundary for Tree Rendering
Create a wrapper to catch Three.js errors gracefully:
```javascript
async function loadTreeSafely() {
  try {
    const { FocusTree } = await import('./tree.js');
    treeInstance = new FocusTree('tree-container');
    treeInstance.init();
    const canvas = $('#tree-container canvas');
    if (canvas) canvas.style.opacity = '0';
  } catch (e) {
    console.warn('Tree load failed, disabling 3D:', e);
    $('#tree-container').innerHTML = '<div style="text-align:center;padding:40px">🌳 (3D not available)</div>';
  }
}
```

### Improvement #2: Add Session State Persistence
Save current session to localStorage so it survives page refresh:
```javascript
function saveSessionState() {
  const state = {
    id: currentSessionId,
    startedAt: Date.now(),
    durationMinutes: Math.ceil(currentSession?.getRemaining() / 60),
    mode: currentSession?.mode
  };
  localStorage.setItem('focusgrove:currentSession', JSON.stringify(state));
}
```

### Improvement #3: Add Network Status Indicator
Show users when the app is offline:
```javascript
window.addEventListener('offline', () => {
  console.warn('App is offline - using local mode');
  document.body.style.borderTop = '3px solid #f85149';  // Visual indicator
});

window.addEventListener('online', () => {
  console.log('App is online again');
  document.body.style.borderTop = 'none';
});
```

---

## 🧪 DEBUGGING CHECKLIST

- [ ] Open DevTools Console and check for errors
- [ ] Run timer tests for 60+ seconds to check for drift
- [ ] Test visibility detection on 3 different browsers
- [ ] Monitor memory usage over 30-minute session
- [ ] Test tree on mobile device with slow connection
- [ ] Verify LocalStorage persistence (F12 → Application → Storage)
- [ ] Test reward creation with edge cases (very long names, extreme costs)
- [ ] Test focus session on slow devices (iPhone SE, older Android)
- [ ] Verify confetti animation doesn't cause jank
- [ ] Test settings persistence after page reload

---

## 📞 REPORTING NEW BUGS

When reporting bugs, include:
1. **Severity:** CRITICAL / HIGH / MEDIUM / LOW
2. **File & Line:** js/app.js (Line 150)
3. **Description:** What happens vs what should happen
4. **Steps to Reproduce:** Exact steps to trigger the bug
5. **Expected Result:** What should happen
6. **Actual Result:** What actually happens
7. **Screenshots/Logs:** DevTools errors, etc.

Example:
```
**Bug: Timer doesn't update when paused**
- Severity: HIGH
- File: js/timer.js (Line 39)
- Steps:
  1. Start timer
  2. Wait 5 seconds
  3. Click pause
  4. Wait 10 seconds
  5. Click resume
- Expected: Timer continues from ~5 seconds
- Actual: Timer jumps to ~15 seconds
- Error: (screenshot of console)
```

