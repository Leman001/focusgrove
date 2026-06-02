/* ===== REWARDS STORE — 3 variations ===== */

const REWARDS = [
  { emoji: '☕', name: 'Coffee break', cost: 60, tint: '#e7d3bd' },
  { emoji: '🎮', name: 'Game hour', cost: 240, tint: '#cfe0d2' },
  { emoji: '🍿', name: 'Movie night', cost: 90, tint: '#dcd6ec' },
  { emoji: '🛍️', name: 'Little treat', cost: 500, tint: '#f0d7cf' },
  { emoji: '🌴', name: 'Day off', cost: 1200, tint: '#cfe2e8' },
];
const BAL = 1240;

function BalanceBadge({ big }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, height: big ? 46 : 38,
      padding: big ? '0 18px' : '0 14px', borderRadius: 999, background: 'var(--ink)', color: '#fff', boxShadow: 'var(--sh-ink)' }}>
      <span style={{ color: 'var(--accent-2)', display: 'flex' }}><Icon.coin /></span>
      <span className="fg-num" style={{ fontWeight: 600, fontSize: big ? 18 : 15 }}>1,240</span>
      <span style={{ fontSize: 12, opacity: 0.6 }}>min</span>
    </div>
  );
}

function RewardCard({ r }) {
  const afford = BAL >= r.cost;
  return (
    <div className="fg-card" style={{ padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(120% 120% at 35% 28%, #fff, ${r.tint})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: 'var(--sh-raise-sm)' }}>{r.emoji}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
        <span className="fg-num" style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>{r.cost} <span style={{ fontWeight: 400, color: 'var(--ink-mute)' }}>min</span></span>
        <button style={{ border: 'none', cursor: 'pointer', height: 34, padding: '0 16px', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          background: afford ? 'var(--accent)' : 'var(--card-2)', color: afford ? '#fff' : 'var(--ink-mute)',
          boxShadow: afford ? '0 6px 16px rgba(255,106,43,0.35)' : 'var(--sh-inset)' }}>
          {afford ? 'Claim' : `Need ${r.cost - BAL}`}</button>
      </div>
    </div>
  );
}

function History() {
  const items = [['🎮', 'Game hour', '−240', 'Yesterday'], ['☕', 'Coffee break', '−60', 'Mon, 9:12']];
  return (
    <div>
      <div className="fg-label" style={{ margin: '0 2px 10px', fontWeight: 500 }}>Recently claimed</div>
      <div className="fg-card" style={{ padding: '4px 4px' }}>
        {items.map(([e, n, c, t], i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: i === 0 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--card-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{e}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{n}</div><div style={{ fontSize: 12, color: 'var(--ink-mute)' }}>{t}</div></div>
            <span className="fg-num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- A · Grid ---------- */
function RewardsA() {
  return (
    <Phone nav="gift" accentNav>
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="fg-h1" style={{ fontSize: 30 }}>Rewards</div>
          <BalanceBadge />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
          {REWARDS.slice(0, 4).map(r => <RewardCard key={r.name} r={r} />)}
        </div>
        <div style={{ marginTop: 18 }}><History /></div>
        <div style={{ marginTop: 'auto' }} />
      </div>
      {/* floating add */}
      <div style={{ position: 'absolute', right: 26, bottom: 96, width: 56, height: 56, borderRadius: '50%', zIndex: 39,
        background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-ink)' }}><Icon.plus /></div>
    </Phone>
  );
}
window.RewardsA = RewardsA;

/* ---------- B · Featured blob ---------- */
function RewardsB() {
  const feat = REWARDS[4];
  return (
    <Phone nav="gift" accentNav>
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div><div className="fg-eyebrow">Store</div><div className="fg-h1" style={{ fontSize: 26, marginTop: 3 }}>Treat yourself</div></div>
          <BalanceBadge />
        </div>

        {/* featured */}
        <div className="fg-card" style={{ marginTop: 18, padding: '22px 22px 26px', borderRadius: 32, position: 'relative', textAlign: 'center' }}>
          <div className="fg-tag" style={{ position: 'absolute', top: 18, left: 18 }}>Top goal</div>
          <div style={{ width: 96, height: 96, margin: '6px auto 14px', borderRadius: '50%', fontSize: 46,
            background: `radial-gradient(120% 120% at 35% 28%, #fff, ${feat.tint})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-raise)' }}>{feat.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{feat.name}</div>
          <div className="fg-num" style={{ fontSize: 36, fontWeight: 600, margin: '6px 0 4px' }}>{feat.cost} <span style={{ fontSize: 18, color: 'var(--ink-mute)' }}>min</span></div>
          {/* progress to afford */}
          <div style={{ height: 8, borderRadius: 999, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', overflow: 'hidden', margin: '12px 8px 0' }}>
            <div style={{ width: (BAL / feat.cost * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginTop: 8 }}>{feat.cost - BAL} min to unlock</div>
        </div>

        {/* two small */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          {REWARDS.slice(0, 2).map(r => <RewardCard key={r.name} r={r} />)}
        </div>
        <div style={{ marginTop: 'auto', paddingBottom: 92 }} />
      </div>
    </Phone>
  );
}
window.RewardsB = RewardsB;

/* ---------- C · List + progress ---------- */
function RewardsC() {
  return (
    <Phone nav="gift" accentNav>
      <div style={{ padding: '6px 22px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div className="fg-h1" style={{ fontSize: 30 }}>Rewards</div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--card)', boxShadow: 'var(--sh-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}><Icon.plus /></div>
        </div>
        {/* balance strip */}
        <div className="fg-card" style={{ marginTop: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--ink)', color: '#fff', border: 'none', boxShadow: 'var(--sh-ink)' }}>
          <div><div style={{ fontSize: 12, opacity: 0.6 }}>Available balance</div><div className="fg-num" style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }}>1,240 <span style={{ fontSize: 14, opacity: 0.6 }}>min</span></div></div>
          <div style={{ color: 'var(--accent-2)' }}><Icon.coin /></div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REWARDS.slice(0, 4).map(r => {
            const afford = BAL >= r.cost;
            return (
              <div key={r.name} className="fg-card" style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: `radial-gradient(120% 120% at 35% 28%, #fff, ${r.tint})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, boxShadow: 'var(--sh-raise-sm)' }}>{r.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 15, fontWeight: 600 }}>{r.name}</span><span className="fg-num" style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>{r.cost} min</span></div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', overflow: 'hidden', marginTop: 8 }}>
                    <div style={{ width: Math.min(100, BAL / r.cost * 100) + '%', height: '100%', borderRadius: 999, background: afford ? 'var(--accent)' : 'var(--ink-faint)' }} />
                  </div>
                </div>
                {afford && <span style={{ color: 'var(--accent)' }}><Icon.chevR /></span>}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', paddingBottom: 92 }} />
      </div>
    </Phone>
  );
}
window.RewardsC = RewardsC;
