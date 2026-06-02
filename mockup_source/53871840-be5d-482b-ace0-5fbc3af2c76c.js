/* ===== DASHBOARD — 3 variations (hybrid: stats top, quick-start bottom) ===== */

function BalanceChip({ small }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: small ? 32 : 38,
      padding: small ? '0 12px' : '0 14px', borderRadius: 999, background: 'var(--card-2)',
      boxShadow: 'var(--sh-raise-sm)', color: 'var(--ink-soft)' }}>
      <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon.coin /></span>
      <span className="fg-num" style={{ fontWeight: 600, fontSize: small ? 13 : 14, color: 'var(--ink)' }}>1,240</span>
      <span style={{ fontSize: 11, color: 'var(--ink-mute)' }}>min</span>
    </div>
  );
}

function StatBlock({ label, value, unit, accent }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="fg-label" style={{ marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span className="fg-num" style={{ fontSize: 30, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--ink)' }}>{value}</span>
        {unit && <span className="fg-num" style={{ fontSize: 15, color: 'var(--ink-mute)' }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ---------- A · Welcome / trends ---------- */
function DashboardA() {
  return (
    <Phone nav="home">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6 }}>
          <div>
            <div className="fg-thin" style={{ fontSize: 26, color: 'var(--ink-mute)', lineHeight: 1 }}>Welcome</div>
            <div className="fg-h1" style={{ fontSize: 36, marginTop: 2 }}>Sumaiya</div>
          </div>
          <Avatar />
        </div>

        {/* primary stats card */}
        <div className="fg-card" style={{ marginTop: 20, padding: '18px 20px', display: 'flex', alignItems: 'center' }}>
          <StatBlock label="Total Focus" value="1,540" unit="h" />
          <div style={{ width: 1, height: 40, background: 'var(--line)' }} />
          <div style={{ flex: 1, paddingLeft: 20 }}>
            <div className="fg-label" style={{ marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon.flame /></span>Day Streak</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span className="fg-num" style={{ fontSize: 30, fontWeight: 600 }}>24</span>
              <span className="fg-num" style={{ fontSize: 15, color: 'var(--ink-mute)' }}>days</span>
            </div>
          </div>
        </div>

        {/* trends */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 2px 12px' }}>
          <span className="fg-h2">Focus Trends</span>
          <BalanceChip small />
        </div>
        <div className="fg-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex' }}>
            <StatBlock label="Today Focus" value="6h" unit="35m" accent />
            <StatBlock label="This Week" value="40h" unit="27m" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <div>
              <div className="fg-label" style={{ marginBottom: 5 }}>Daily Avg</div>
              <div className="fg-num" style={{ fontSize: 22, fontWeight: 600 }}>7h <span style={{ fontSize: 14, color: 'var(--ink-mute)' }}>35m</span></div>
            </div>
            <MiniBars />
          </div>
        </div>

        {/* quick start pinned */}
        <div style={{ marginTop: 'auto', paddingBottom: 96 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="fg-chip" style={{ flex: 1, justifyContent: 'space-between', height: 62 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon.clock /></span>
                <span style={{ fontWeight: 500 }}>Focus <b className="fg-num" style={{ fontWeight: 600 }}>25:00</b></span>
              </span>
              <span style={{ color: 'var(--ink-mute)' }}><Icon.chevR /></span>
            </div>
          </div>
          <button className="fg-btn" style={{ marginTop: 12 }}>Start Focus</button>
        </div>
      </div>
    </Phone>
  );
}
window.DashboardA = DashboardA;

/* ---------- B · Dial-forward ---------- */
function DashboardB() {
  return (
    <Phone nav="home">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* compact header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div>
            <div className="fg-eyebrow">Tuesday, 2 Jun</div>
            <div className="fg-h1" style={{ fontSize: 26, marginTop: 4 }}>Ready to focus?</div>
          </div>
          <Avatar size={42} />
        </div>

        {/* mini stat chips */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[['Today', '6h 35m', false], ['Streak', '24d', false], ['Balance', '1,240', true]].map(([l, v, a]) => (
            <div key={l} className="fg-card" style={{ flex: 1, padding: '12px 14px' }}>
              <div className="fg-label" style={{ fontSize: 11.5 }}>{l}</div>
              <div className="fg-num" style={{ fontSize: 18, fontWeight: 600, marginTop: 3, color: a ? 'var(--accent)' : 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* dial hero */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <Dial minutes={25} size={258} />
          <div className="fg-chip" style={{ height: 48 }}>
            <span style={{ fontWeight: 500 }}>Focus <b className="fg-num" style={{ fontWeight: 600 }}>25:00</b></span>
            <span style={{ color: 'var(--ink-mute)' }}><Icon.chevR /></span>
          </div>
        </div>

        {/* start */}
        <div style={{ paddingBottom: 96 }}>
          <button className="fg-btn">Start Focus</button>
        </div>
      </div>
    </Phone>
  );
}
window.DashboardB = DashboardB;

/* ---------- C · Control panel ---------- */
function DashboardC() {
  const durs = [25, 45, 60];
  return (
    <Phone nav="home">
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Avatar size={40} />
            <div>
              <div className="fg-label" style={{ fontSize: 12 }}>Welcome back</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Sumaiya</div>
            </div>
          </div>
          <BalanceChip small />
        </div>

        {/* hero today number */}
        <div className="fg-card" style={{ marginTop: 18, padding: '20px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="fg-label" style={{ marginBottom: 6 }}>Today's focus</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="fg-num" style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.04em' }}>6h</span>
              <span className="fg-num" style={{ fontSize: 24, color: 'var(--ink-mute)' }}>35m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
              <Icon.flame /><span>24-day streak</span>
            </div>
          </div>
          <Dial minutes={25} size={120} showCenter={false} />
        </div>

        {/* duration selector */}
        <div style={{ margin: '22px 2px 12px' }} className="fg-h2">Session length</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {durs.map((d, i) => (
            <div key={d} style={{ flex: 1, height: 70, borderRadius: 18, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: i === 0 ? 'var(--ink)' : 'var(--card)', color: i === 0 ? '#fff' : 'var(--ink)',
              boxShadow: i === 0 ? 'var(--sh-ink)' : 'var(--sh-card)' }}>
              <span className="fg-num" style={{ fontSize: 24, fontWeight: 600 }}>{d}</span>
              <span style={{ fontSize: 11, opacity: 0.6 }}>min</span>
            </div>
          ))}
          <div style={{ width: 70, height: 70, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', color: 'var(--ink-mute)' }}><Icon.plus /></div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 96 }}>
          <button className="fg-btn fg-btn--accent"><Icon.bolt /> Start Focus</button>
        </div>
      </div>
    </Phone>
  );
}
window.DashboardC = DashboardC;
