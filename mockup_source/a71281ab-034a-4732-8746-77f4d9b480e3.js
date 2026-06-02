/* Phone — warm bezel + screen surface for FocusGrove mocks */
function Phone({ children, w = 384, h = 832, nav = null, accentNav = false, statusbar = true }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 52, position: 'relative',
      background: 'linear-gradient(150deg,#36332e,#17150f)',
      padding: 11, boxShadow: '0 50px 90px rgba(40,36,28,0.4), 0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 2px rgba(255,255,255,0.06)',
    }}>
      <div className="fg" style={{ width: '100%', height: '100%', borderRadius: 42, overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>
        <div className="fg-screen">
          <div className="fg-grain" />
          {/* dynamic island */}
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', width: 116, height: 33, borderRadius: 20, background: '#0c0b08', zIndex: 30 }} />
          {statusbar && <StatusBar />}
          <div style={{ position: 'relative', zIndex: 2, height: statusbar ? 'calc(100% - 44px)' : '100%' }}>
            {children}
          </div>
          {nav && <FloatingNav active={nav} accentActive={accentNav} />}
        </div>
      </div>
    </div>
  );
}
window.Phone = Phone;
