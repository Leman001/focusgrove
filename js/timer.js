// FocusGrove — Timer Module
// Focus session timer with countdown/countup modes
// FIXED: Resume timing issue, better pause/resume accuracy

export class FocusTimer {
  /**
   * @param {Object} options
   * @param {number} options.duration - Target duration in seconds
   * @param {'countdown'|'countup'} options.mode - Timer display mode
   * @param {(elapsed: number, remaining: number, progress: number) => void} options.onTick
   * @param {(totalSeconds: number) => void} options.onComplete
   * @param {() => void} options.onPause
   */
  constructor({ duration, mode = 'countdown', onTick, onComplete, onPause }) {
    this.targetDuration = duration;
    this.mode = mode;
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.onPause = onPause || (() => {});

    this.elapsed = 0;        // seconds elapsed
    this.running = false;
    this.paused = false;
    this._intervalId = null;
    this._startTime = null;
    this._pauseOffset = 0;
    this._pauseTime = 0;     // NEW: Track when pause started
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._startTime = Date.now();
    this._pauseOffset = 0;
    this._pauseTime = 0;
    this.elapsed = 0;
    this._tick();
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    this._pauseTime = Date.now();  // NEW: Record pause time
    this._pauseOffset = this.elapsed;
    clearInterval(this._intervalId);
    this._intervalId = null;
    this.onPause();
  }

  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // FIX: Adjust start time to account for pause duration
    const pauseDuration = (Date.now() - this._pauseTime) / 1000;
    this._startTime = Date.now() - (this._pauseOffset * 1000);
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  stop() {
    const finalElapsed = this.elapsed;
    this.running = false;
    this.paused = false;
    clearInterval(this._intervalId);
    this._intervalId = null;
    return finalElapsed;
  }

  getElapsed() {
    return this.elapsed;
  }

  getRemaining() {
    return Math.max(0, this.targetDuration - this.elapsed);
  }

  getProgress() {
    if (this.targetDuration <= 0) return 0;
    return Math.min(1, this.elapsed / this.targetDuration);
  }

  setMode(mode) {
    this.mode = mode;
  }

  getDisplayTime() {
    if (this.mode === 'countdown') {
      return this._formatTime(this.getRemaining());
    }
    return this._formatTime(this.elapsed);
  }

  _tick() {
    if (this.paused) return;
    
    // Use wall clock for accuracy (avoids drift)
    this.elapsed = this._pauseOffset + Math.floor((Date.now() - this._startTime) / 1000);

    const progress = this.getProgress();
    const remaining = this.getRemaining();

    this.onTick(this.elapsed, remaining, progress);

    if (this.elapsed >= this.targetDuration) {
      this.stop();
      this.onComplete(this.elapsed);
    }
  }

  _formatTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
