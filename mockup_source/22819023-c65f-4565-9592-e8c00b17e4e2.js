/* ===== FOCUS MODE — 3 variations (no nav: distraction-free) ===== */

function SegToggle({ left = 'Countdown', right = 'Count up', active = 0 }) {
  return (
    <div style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)' }}>
      {[left, right].map((t, i) => (
        <div key={t} style={{ padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600,
          background: active === i ? 'var(--card-hi)' : 'transparent',
          color: active === i ? 'var(--ink)' : 'var(--ink-mute)',
          boxShadow: active === i ? 'var(--sh-pill)' : 'none' }}>{t}</div>
      ))}
    </div>
  );
}

function CircleBtn({ children, accent, ghost, size = 64 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: ghost ? 'var(--card)' : (accent ? 'var(--accent)' : 'var(--ink)'),
      color: ghost ? 'var(--ink-soft)' : '#fff',
      boxShadow: ghost ? 'var(--sh-card)' : (accent ? '0 8px 22px rgba(255,106,43,0.4)' : 'var(--sh-ink)') }}>
      {children}
    </div>
  );
}

function ProgressBar({ pct = 36, accent = 'var(--accent)' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-mute)', marginBottom: 8 }}>
        <span>0%</span><span className="fg-num" style={{ color: 'var(--ink)', fontWeight: 600 }}>{pct}%</span><span>100%</span>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: accent }} />
      </div>
    </div>
  );
}

/* ---------- A · Zen ---------- */
function FocusA() {
  return (
    <Phone>
      <div style={{ padding: '14px 24px 30px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="fg-tag fg-tag--soft" style={{ marginTop: 8 }}><span style={{ display: 'flex', marginRight: 6, color: 'var(--accent)' }}><Icon.focus /></span>Deep Work · 25 min</div>
        <div style={{ marginTop: 14 }}><SegToggle /></div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <ProgressDial size={300} progress={0.42} label="18:24" sub="remaining of 25:00" />
        </div>

        <div style={{ width: '100%' }}>
          <ProgressBar pct={42} />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 22, marginTop: 28, alignItems: 'center' }}>
            <CircleBtn ghost size={58}><Icon.bolt /></CircleBtn>
            <CircleBtn size={78}><svg width="22" height="24" viewBox="0 0 22 24" fill="#fff"><rect x="3" y="3" width="5" height="18" rx="2"/><rect x="14" y="3" width="5" height="18" rx="2"/></svg></CircleBtn>
            <CircleBtn ghost size={58}><svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="4" width="12" height="12" rx="3" fill="var(--ink-soft)"/></svg></CircleBtn>
          </div>
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--ink-mute)' }}>End early</div>
        </div>
      </div>
    </Phone>
  );
}
window.FocusA = FocusA;

/* ---------- B · Growth orb ---------- */
function FocusB() {
  return (
    <Phone>
      <div style={{ padding: '14px 24px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>
            <div className="fg-eyebrow">Focusing</div>
            <div className="fg-num" style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1 }}>18:24</div>
          </div>
          <SegToggle />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <ProgressDial size={266} progress={0.42} label="" sub="" />
            {/* growth glyph in center */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'radial-gradient(130% 130% at 35% 28%, #ff8a4c, #e8531a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px rgba(232,83,26,0.4), inset 0 2px 3px rgba(255,255,255,0.3)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21V9"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5Z" fill="rgba(255,255,255,0.3)"/><path d="M12 10c3 0 5-2 5-5-3 0-5 2-5 5Z" fill="rgba(255,255,255,0.3)"/>
                </svg>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Your grove is growing</div>
            <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 3 }}>Stay for 7 more minutes to bloom</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="fg-btn" style={{ flex: 1, background: 'var(--card)', color: 'var(--ink-soft)', boxShadow: 'var(--sh-card)' }}>End early</button>
          <button className="fg-btn" style={{ flex: 2 }}><svg width="16" height="18" viewBox="0 0 22 24" fill="#fff" style={{ marginRight: 4 }}><rect x="3" y="3" width="5" height="18" rx="2"/><rect x="14" y="3" width="5" height="18" rx="2"/></svg>Pause</button>
        </div>
      </div>
    </Phone>
  );
}
window.FocusB = FocusB;

/* ---------- C · Control panel ---------- */
function FocusC() {
  return (
    <Phone>
      <div style={{ padding: '14px 22px 30px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><SegToggle /></div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProgressDial size={290} progress={0.42} label="18:24" sub="of 25:00" />
        </div>

        {/* reward hint — economy, subtle */}
        <div className="fg-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ink-soft)' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon.coin /></span>Earning this session</span>
          <span className="fg-num" style={{ fontWeight: 600, fontSize: 16, color: 'var(--accent)' }}>+25 min</span>
        </div>

        <ProgressBar pct={42} />

        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <button className="fg-btn" style={{ flex: 1, background: 'var(--card)', color: 'var(--ink-soft)', boxShadow: 'var(--sh-card)', height: 58 }}>End early</button>
          <button className="fg-btn" style={{ flex: 1, height: 58 }}>Pause</button>
        </div>
      </div>
    </Phone>
  );
}
window.FocusC = FocusC;
