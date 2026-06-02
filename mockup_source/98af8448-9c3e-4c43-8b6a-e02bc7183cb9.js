/* ===== SETTINGS — 3 variations ===== */

function SRow({ icon, label, children, last, tint = 'var(--card-2)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      {icon && <div style={{ width: 34, height: 34, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)' }}>{icon}</div>}
      <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}
function GroupLabel({ children }) {
  return <div className="fg-eyebrow" style={{ margin: '22px 4px 10px' }}>{children}</div>;
}
function ValuePill({ children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }} className="fg-num">{children}<span style={{ color: 'var(--ink-faint)' }}><Icon.chevR /></span></span>;
}

/* ---------- A · Grouped list ---------- */
function SettingsA() {
  return (
    <Phone nav="cog">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="fg-h1" style={{ fontSize: 30, marginTop: 8 }}>Settings</div>

        {/* profile */}
        <div className="fg-card" style={{ marginTop: 18, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar size={52} />
          <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 600 }}>Sumaiya</div><div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Focused 24 days in a row</div></div>
          <span style={{ color: 'var(--ink-faint)' }}><Icon.chevR /></span>
        </div>

        <GroupLabel>Session</GroupLabel>
        <div className="fg-card" style={{ padding: 0 }}>
          <SRow icon={<Icon.clock />} label="Default duration"><ValuePill>25 min</ValuePill></SRow>
          <SRow icon={<Icon.focus />} label="Default timer mode" last><ValuePill>Countdown</ValuePill></SRow>
        </div>

        <GroupLabel>Preferences</GroupLabel>
        <div className="fg-card" style={{ padding: 0 }}>
          <SRow icon={<span style={{ fontSize: 15 }}>🌐</span>} label="Language"><ValuePill>English</ValuePill></SRow>
          <SRow icon={<Icon.bolt />} label="Strict mode" last><Toggle on /></SRow>
        </div>

        <GroupLabel>Danger zone</GroupLabel>
        <div className="fg-card" style={{ padding: 0 }}>
          <SRow label={<span style={{ color: '#e5484d' }}>Wipe all data</span>} last icon={<span style={{ color: '#e5484d' }}><Icon.bolt /></span>} tint="#fbe3e3">
            <span style={{ color: 'var(--ink-faint)' }}><Icon.chevR /></span>
          </SRow>
        </div>
      </div>
    </Phone>
  );
}
window.SettingsA = SettingsA;

/* ---------- B · Card tiles ---------- */
function SettingsB() {
  return (
    <Phone nav="cog">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
          <Avatar size={56} />
          <div><div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Sumaiya</div><div style={{ fontSize: 13, color: 'var(--ink-mute)' }}>Edit profile</div></div>
        </div>

        {/* two big choice tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 22 }}>
          <div className="fg-card" style={{ padding: '18px' }}>
            <div className="fg-label">Default duration</div>
            <div className="fg-num" style={{ fontSize: 30, fontWeight: 600, marginTop: 8 }}>25<span style={{ fontSize: 14, color: 'var(--ink-mute)' }}> min</span></div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>{[25, 45, 60].map((d, i) => <div key={d} style={{ flex: 1, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, background: i === 0 ? 'var(--ink)' : 'var(--card-2)', color: i === 0 ? '#fff' : 'var(--ink-mute)' }}>{d}</div>)}</div>
          </div>
          <div className="fg-card" style={{ padding: '18px' }}>
            <div className="fg-label">Timer mode</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 8 }}>Countdown</div>
            <div style={{ marginTop: 12 }}><SegToggle left="Down" right="Up" /></div>
          </div>
        </div>

        <div className="fg-card" style={{ marginTop: 12, padding: 0 }}>
          <SRow icon={<span style={{ fontSize: 15 }}>🌐</span>} label="Language"><SegToggle left="EN" right="RU" /></SRow>
          <SRow icon={<Icon.bolt />} label="Strict mode" last><Toggle on /></SRow>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 96 }}>
          <button className="fg-btn" style={{ background: 'transparent', color: '#e5484d', boxShadow: 'none', border: '1.5px solid rgba(229,72,77,0.3)', height: 54 }}>Wipe all data</button>
        </div>
      </div>
    </Phone>
  );
}
window.SettingsB = SettingsB;

/* ---------- C · Minimal ---------- */
function SettingsC() {
  return (
    <Phone nav="cog">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="fg-h1" style={{ fontSize: 34, marginTop: 12 }}>Settings</div>
        <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 4 }}>Tune your focus sessions</div>

        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[['Default duration', '25 min'], ['Timer mode', 'Countdown'], ['Language', 'English'], ['Notifications', 'On']].map(([l, v], i) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 4px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{l}</span>
              <ValuePill>{v}</ValuePill>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 4px' }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>Strict mode</span><Toggle on />
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 96 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-mute)', textAlign: 'center', marginBottom: 12 }}>FocusGrove v2.0</div>
          <button className="fg-btn" style={{ background: 'transparent', color: '#e5484d', boxShadow: 'none', border: 'none', height: 48, fontSize: 15 }}>Wipe all data</button>
        </div>
      </div>
    </Phone>
  );
}
window.SettingsC = SettingsC;
