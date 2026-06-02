// FocusGrove — Visibility Module
// Detects when user leaves/switches away from the app tab

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
  }

  start() {
    this.leaveCount = 0;
    this.active = true;
    document.addEventListener('visibilitychange', this._handler);
    
    // Also detect window blur (covers some edge cases on mobile)
    window.addEventListener('blur', this._handleBlur.bind(this));
  }

  stop() {
    this.active = false;
    document.removeEventListener('visibilitychange', this._handler);
    window.removeEventListener('blur', this._handleBlur.bind(this));
  }

  reset() {
    this.leaveCount = 0;
  }

  getLeaveCount() {
    return this.leaveCount;
  }

  _handleVisibilityChange() {
    if (!this.active) return;

    if (document.hidden) {
      this._handleLeave();
    } else {
      this.onReturn();
    }
  }

  _handleBlur() {
    // On mobile browsers, blur can fire when switching apps
    // Only count it if the document is also hidden
    if (!this.active) return;
    
    setTimeout(() => {
      if (document.hidden) {
        this._handleLeave();
      }
    }, 100);
  }

  _handleLeave() {
    this.leaveCount++;

    if (this.leaveCount === 1) {
      this.onFirstLeave();
    } else if (this.leaveCount >= 2) {
      this.onSecondLeave();
    }
  }
}
