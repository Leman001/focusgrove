/* FocusGrove shared primitives — exported to window */

/* ---- icons (stroke, 24) ---- */
const Icon = {
  home: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/></svg>,
  focus: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/></svg>,
  gift:  (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 11h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M3 7.5h18V11H3zM12 7.5V20"/><path d="M12 7.5C12 5 10.5 4 9 4S6.5 5.5 7.5 6.7 12 7.5 12 7.5ZM12 7.5c0-2.5 1.5-3.5 3-3.5s2.5 1.5 1.5 2.7S12 7.5 12 7.5Z"/></svg>,
  cog:   (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3"/></svg>,
  chevR: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 5 7 7-7 7"/></svg>,
  plus:  (p) => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  flame: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3c1 3-2 4-2 7a4 4 0 0 0 8 0c0-2-1-3-1-3 .5 4-2 4-2 1 0-2-1-4-1-6Z"/><path d="M8 12c-1 1-2 2.5-2 4a6 6 0 0 0 12 0c0-1-.3-2-1-3"/></svg>,
  clock: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>,
  coin:  (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.6 9.2c.7-.8 4.8-1.1 4.8 1s-4.4 1.4-4.8 2.5 4 1.6 4.8.8"/></svg>,
  bolt:  (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>,
};
window.Icon = Icon;

/* ---- avatar (warm gradient placeholder) ---- */
function Avatar({ size = 46, ring = 'var(--accent)' }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', padding: 2.5, background: ring, boxShadow: 'var(--sh-pill)' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%',
        background: 'radial-gradient(120% 120% at 30% 20%, #ffd8a8, #ff9d5c 45%, #e8531a)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 40 40">
          <circle cx="20" cy="15" r="7" fill="rgba(255,255,255,0.92)"/>
          <path d="M6 40c2-9 8-12 14-12s12 3 14 12z" fill="rgba(255,255,255,0.92)"/>
        </svg>
      </div>
    </div>
  );
}
window.Avatar = Avatar;

/* ===========================================================
   Dial — neumorphic plate + fine tick ring + center minutes
   =========================================================== */
function TickRing({ size = 300, count = 116, fraction = 0.42, accent = 'var(--accent)', active = true }) {
  const c = size / 2;
  const rOuter = size * 0.46;
  const minLen = size * 0.028;
  const majLen = size * 0.05;
  const activeCount = Math.round(fraction * count);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    const a = (-90 + (i / count) * 360) * Math.PI / 180;
    const isMaj = i % (count / 12 | 0) === 0;
    const len = isMaj ? majLen : minLen;
    const r1 = rOuter - len, r2 = rOuter;
    const x1 = c + r1 * Math.cos(a), y1 = c + r1 * Math.sin(a);
    const x2 = c + r2 * Math.cos(a), y2 = c + r2 * Math.sin(a);
    const on = active && i < activeCount;
    ticks.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={on ? accent : (isMaj ? '#b9b3a6' : '#cfc9bd')}
        strokeWidth={isMaj ? 1.6 : 1} strokeLinecap="round"
        opacity={on ? 1 : (isMaj ? 0.9 : 0.7)} />
    );
  }
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>{ticks}</svg>;
}
window.TickRing = TickRing;

function Dial({ minutes = 25, max = 60, size = 290, color = 'var(--ink)', accent = 'var(--accent)', showCenter = true }) {
  const fraction = Math.min(minutes / max, 1);
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* outer concentric halos */}
      <div style={{ position: 'absolute', width: size * 1.18, height: size * 1.18, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,255,255,0.55), transparent)', filter: 'blur(2px)' }} />
      {/* raised plate */}
      <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(130% 130% at 32% 28%, #ffffff, #efece6 78%)',
        boxShadow: 'var(--sh-raise)' }} />
      {/* inner dished disc */}
      <div style={{ position: 'absolute', width: size * 0.82, height: size * 0.82, borderRadius: '50%',
        background: 'radial-gradient(120% 120% at 35% 30%, #ffffff, #f4f1ea)',
        boxShadow: 'inset 6px 6px 16px rgba(176,168,153,0.4), inset -6px -6px 16px rgba(255,255,255,0.9)' }} />
      <div style={{ position: 'absolute' }}><TickRing size={size * 0.78} fraction={fraction} accent={accent} /></div>
      {/* center knob */}
      {showCenter && (
        <div style={{ position: 'relative', zIndex: 2, width: size * 0.34, height: size * 0.34, borderRadius: '50%',
          background: color === 'var(--ink)' ? 'radial-gradient(130% 130% at 35% 28%, #2c2a26, #141310)' : color,
          boxShadow: '0 10px 24px rgba(26,25,22,0.32), inset 0 2px 3px rgba(255,255,255,0.25)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <span className="fg-num" style={{ fontSize: size * 0.135, fontWeight: 600, lineHeight: 1 }}>{minutes}</span>
          <span style={{ fontSize: size * 0.045, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.65, marginTop: 2 }}>min</span>
        </div>
      )}
    </div>
  );
}
window.Dial = Dial;

/* progress ring for active focus (countdown) */
function ProgressDial({ size = 300, progress = 0.36, label = '18:24', sub = 'of 25:00', accent = 'var(--accent)' }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%',
        background: 'radial-gradient(130% 130% at 32% 28%, #ffffff, #efece6 78%)', boxShadow: 'var(--sh-raise)' }} />
      <div style={{ position: 'absolute', width: size * 0.84, height: size * 0.84, borderRadius: '50%',
        background: 'radial-gradient(120% 120% at 35% 30%, #ffffff, #f4f1ea)',
        boxShadow: 'inset 6px 6px 16px rgba(176,168,153,0.4), inset -6px -6px 16px rgba(255,255,255,0.9)' }} />
      <div style={{ position: 'absolute' }}><TickRing size={size * 0.78} fraction={progress} accent={accent} /></div>
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div className="fg-num" style={{ fontSize: size * 0.17, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: size * 0.05, color: 'var(--ink-mute)', marginTop: 4, letterSpacing: '0.02em' }}>{sub}</div>
      </div>
    </div>
  );
}
window.ProgressDial = ProgressDial;

/* ---- weekly mini bars (multi-color) ---- */
function MiniBars({ data = [0.5,0.8,0.4,0.95,0.6,0.75,0.55], h = 44 }) {
  const cols = ['var(--c-blue)','var(--accent)','var(--c-green)','var(--c-yellow)','var(--c-violet)','var(--accent)','var(--c-blue)'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: h }}>
      {data.map((v, i) => (
        <div key={i} style={{ width: 6, height: Math.max(8, v * h), borderRadius: 4,
          background: cols[i % cols.length], opacity: 0.92 }} />
      ))}
    </div>
  );
}
window.MiniBars = MiniBars;

/* ---- category row (Reading 3h14m | dot) ---- */
function CategoryRow({ name, time, color = 'var(--c-green)', last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '15px 18px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="fg-num" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{time}</span>
        <span style={{ width: 4, height: 18, borderRadius: 3, background: color }} />
      </span>
    </div>
  );
}
window.CategoryRow = CategoryRow;

/* ---- floating pill nav ---- */
function FloatingNav({ active = 'home', accentActive = false }) {
  const items = [['home', Icon.home], ['focus', Icon.focus], ['gift', Icon.gift], ['cog', Icon.cog]];
  return (
    <div className="fg-nav">
      {items.map(([key, Ic]) => (
        <div key={key} className={'fg-nav__item' + (active === key ? ' is-active' : '') + (active === key && accentActive ? ' is-accent' : '')}>
          <Ic />
        </div>
      ))}
    </div>
  );
}
window.FloatingNav = FloatingNav;

/* ---- toggle ---- */
function Toggle({ on = true }) {
  return (
    <div style={{ width: 50, height: 30, borderRadius: 999, padding: 3,
      background: on ? 'var(--accent)' : '#d8d3c8', display: 'flex',
      justifyContent: on ? 'flex-end' : 'flex-start',
      boxShadow: on ? 'inset 0 1px 3px rgba(0,0,0,0.15)' : 'var(--sh-inset)', transition: 'all .2s' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
    </div>
  );
}
window.Toggle = Toggle;

/* ---- status bar (dark glyphs for light bg) ---- */
function StatusBar() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 30px 4px', color: 'var(--ink)', position: 'relative', zIndex: 5 }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>9:41</span>
      <span style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="7" width="3" height="5" rx="0.7" fill="currentColor"/><rect x="4.5" y="4.5" width="3" height="7.5" rx="0.7" fill="currentColor"/><rect x="9" y="2" width="3" height="10" rx="0.7" fill="currentColor"/><rect x="13.5" y="0" width="3" height="12" rx="0.7" fill="currentColor"/></svg>
        <svg width="16" height="12" viewBox="0 0 17 12"><path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5 5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill="currentColor"/><path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1 6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill="currentColor"/><circle cx="8.5" cy="10.5" r="1.4" fill="currentColor"/></svg>
        <svg width="26" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5 26.5 5.8 25.8 4.8 25 4.5Z" fill="currentColor" fillOpacity="0.4"/></svg>
      </span>
    </div>
  );
}
window.StatusBar = StatusBar;
