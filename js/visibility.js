// FocusGrove — Visibility Module
// Detects when user leaves/switches away from the app tab
// FIXED: Improved reliability of tab switch detection

export class VisibilityMonitor {
  /**
   * @param {Object} callbacks
   * @param {() => void} callbacks.onFirstLeave  - Called on first tab switch (warning)
   * @param {() => void} callbacks.onSecondLeave - Called on second tab switch (reset session)
   * @param {() => void} callbacks.onReturn      - Called when user returns to tab
   */
  constructor({ onFirstLeave, onSecondLeave, onReturn }) {
    this.onFirstLeave = onFirstLeave || (() => {});
    this.onSecondLeave = onSecondLeave || (() => {});
    this.onReturn = onReturn || (() => {});
    
    this.leaveCount = 0;
    this.active = false;
    this._handler = this._handleVisibilityChange.bind(this);
    this._blurHandler = this._handleBlur.bind(this);
    this._pendingLeave = false;  // NEW: Prevent duplicate detection
  }

  start() {
    this.leaveCount = 0;
    this.active = true;
    this._pendingLeave = false;
    document.addEventListener('visibilitychange', this._handler);
    
    // Also detect window blur (covers some edge cases on mobile)
    window.addEventListener('blur', this._blurHandler);
  }

  stop() {
    this.active = false;
    document.removeEventListener('visibilitychange', this._handler);
    window.removeEventListener('blur', this._blurHandler);
    this._pendingLeave = false;
  }

  reset() {
    this.leaveCount = 0;
    this._pendingLeave = false;
  }

  getLeaveCount() {
    return this.leaveCount;
  }

  _handleVisibilityChange() {
    if (!this.active) return;

    if (document.hidden) {
      this._handleLeave();
    } else {
      this._pendingLeave = false;  // NEW: Reset pending flag on return
      this.onReturn();
    }
  }

  _handleBlur() {
    // On mobile browsers, blur can fire when switching apps
    // Only count it if the document is also hidden
    if (!this.active) return;
    
    // FIX: Check immediately first, then with slight delay
    if (document.hidden) {
      this._handleLeave();
      return;
    }
    
    // If not hidden yet, check again after brief delay
    setTimeout(() => {
      if (this.active && document.hidden && !this._pendingLeave) {
        this._handleLeave();
      }
    }, 50);  // FIX: Reduced from 100ms to 50ms for faster detection
  }

  _handleLeave() {
    // NEW: Prevent duplicate leave events
    if (this._pendingLeave) return;
    this._pendingLeave = true;
    
    this.leaveCount++;

    if (this.leaveCount === 1) {
      this.onFirstLeave();
    } else if (this.leaveCount >= 2) {
      this.onSecondLeave();
    }
  }
}
