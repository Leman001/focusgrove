/* ===== MODALS — glass cards over dimmed surface ===== */

function ModalShell({ children, h = 832 }) {
  return (
    <Phone statusbar={false} h={h}>
      {/* blurred backdrop hint */}
      <div style={{ position: 'absolute', inset: 0, filter: 'blur(3px)', opacity: 0.5 }}>
        <div style={{ padding: 30, paddingTop: 70 }}>
          <div style={{ height: 30, width: 140, borderRadius: 8, background: 'var(--card)' }} />
          <div className="fg-card" style={{ height: 90, marginTop: 20 }} />
          <div className="fg-card" style={{ height: 150, marginTop: 16 }} />
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,30,24,0.45)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {children}
      </div>
    </Phone>
  );
}

function Card({ children, style }) {
  return <div style={{ width: '100%', background: 'var(--card-hi)', borderRadius: 30, padding: '28px 24px', boxShadow: '0 30px 70px rgba(20,16,10,0.4)', textAlign: 'center', ...style }}>{children}</div>;
}

/* Complete — earned minutes */
function ModalComplete() {
  return (
    <ModalShell>
      <Card>
        <div style={{ width: 92, height: 92, margin: '0 auto 18px', borderRadius: '50%', background: 'radial-gradient(130% 130% at 35% 28%, #ff8a4c, #e8531a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 30px rgba(232,83,26,0.4)' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7"/></svg>
        </div>
        <div className="fg-h2" style={{ fontSize: 24 }}>Session complete</div>
        <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 8, lineHeight: 1.5 }}>Beautiful focus. You grew your grove and banked new minutes.</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '18px 0 4px', padding: '10px 18px', borderRadius: 999, background: 'var(--card-2)', boxShadow: 'var(--sh-raise-sm)' }}>
          <span style={{ color: 'var(--accent)' }}><Icon.coin /></span>
          <span className="fg-num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--accent)' }}>+25 min</span>
        </div>
        <button className="fg-btn" style={{ marginTop: 18 }}>Done</button>
      </Card>
    </ModalShell>
  );
}
window.ModalComplete = ModalComplete;

/* Add reward — form */
function ModalAddReward() {
  return (
    <ModalShell>
      <Card style={{ textAlign: 'left' }}>
        <div className="fg-h2" style={{ fontSize: 22, textAlign: 'center' }}>New reward</div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🎁</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
          {['☕','🎮','🍿','🛍️','🌴','📚'].map((e, i) => <div key={e} style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: i === 1 ? 'var(--ink)' : 'var(--card-2)', boxShadow: i === 1 ? 'var(--sh-ink)' : 'none' }}>{e}</div>)}
        </div>
        <div className="fg-label" style={{ marginBottom: 7 }}>Name</div>
        <div style={{ height: 50, borderRadius: 14, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 15, color: 'var(--ink-soft)' }}>Game hour<span style={{ width: 1.5, height: 20, background: 'var(--accent)', marginLeft: 2 }} /></div>
        <div className="fg-label" style={{ margin: '14px 0 7px' }}>Cost (minutes)</div>
        <div style={{ height: 50, borderRadius: 14, background: 'var(--card-2)', boxShadow: 'var(--sh-inset)', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 15, color: 'var(--ink)' }} className="fg-num">240</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="fg-btn" style={{ flex: 1, background: 'var(--card-2)', color: 'var(--ink-soft)', boxShadow: 'none', height: 54 }}>Cancel</button>
          <button className="fg-btn fg-btn--accent" style={{ flex: 1, height: 54 }}>Add</button>
        </div>
      </Card>
    </ModalShell>
  );
}
window.ModalAddReward = ModalAddReward;

/* Celebration — confetti */
function ModalCelebrate() {
  const confetti = [];
  const cols = ['#ff6a2b', '#4f7dff', '#3fb37a', '#f4b740', '#8b7bff'];
  for (let i = 0; i < 28; i++) {
    const left = Math.random() * 100, top = Math.random() * 70, rot = Math.random() * 360;
    confetti.push(<div key={i} style={{ position: 'absolute', left: left + '%', top: top + '%', width: 7, height: 11, borderRadius: 2, background: cols[i % 5], transform: `rotate(${rot}deg)`, opacity: 0.9 }} />);
  }
  return (
    <ModalShell>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{confetti}</div>
      <Card>
        <div style={{ fontSize: 56, marginBottom: 6 }}>🎮</div>
        <div className="fg-h2" style={{ fontSize: 24 }}>Reward claimed!</div>
        <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 8, lineHeight: 1.5 }}>Enjoy your <b style={{ color: 'var(--ink)' }}>Game hour</b>. You earned every minute of it.</div>
        <div style={{ fontSize: 13, color: 'var(--ink-mute)', marginTop: 16 }}>New balance</div>
        <div className="fg-num" style={{ fontSize: 28, fontWeight: 600, marginTop: 2 }}>1,000 <span style={{ fontSize: 15, color: 'var(--ink-mute)' }}>min</span></div>
        <button className="fg-btn" style={{ marginTop: 20 }}>Nice</button>
      </Card>
    </ModalShell>
  );
}
window.ModalCelebrate = ModalCelebrate;

/* Warning — left the app */
function ModalWarning() {
  return (
    <ModalShell>
      <Card>
        <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: '50%', background: '#fbe3e3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e5484d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5"/><circle cx="12" cy="16.5" r="0.4" fill="#e5484d" stroke="none"/><path d="M10.3 3.9 2.4 18a1.6 1.6 0 0 0 1.4 2.4h16.4a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z"/></svg>
        </div>
        <div className="fg-h2" style={{ fontSize: 22 }}>You left the app</div>
        <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 8, lineHeight: 1.5 }}>Don't do it again — one more time and this session resets.</div>
        <button className="fg-btn" style={{ marginTop: 22 }}>Back to focus</button>
      </Card>
    </ModalShell>
  );
}
window.ModalWarning = ModalWarning;

/* Confirm delete */
function ModalDelete() {
  return (
    <ModalShell>
      <Card>
        <div className="fg-h2" style={{ fontSize: 22 }}>Delete this reward?</div>
        <div style={{ fontSize: 14, color: 'var(--ink-mute)', marginTop: 8, lineHeight: 1.5 }}>"Game hour" will be removed from your store. This can't be undone.</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="fg-btn" style={{ flex: 1, background: 'var(--card-2)', color: 'var(--ink-soft)', boxShadow: 'none', height: 54 }}>Keep</button>
          <button className="fg-btn" style={{ flex: 1, background: '#e5484d', boxShadow: '0 8px 20px rgba(229,72,77,0.35)', height: 54 }}>Delete</button>
        </div>
      </Card>
    </ModalShell>
  );
}
window.ModalDelete = ModalDelete;
