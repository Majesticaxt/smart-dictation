/**
 * LandingPage — Hero section with gradient background.
 * Cards route to: Web App → dictate, Android Keyboard → setup info, API → dashboard.
 */
export default function LandingPage({ onOpenApp }) {
  const surfaces = [
    {
      title: 'Web App',
      subtitle: 'Dictate, clean, and manage your transcriptions from any browser.',
      hint: 'Open App',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      ),
      action: () => onOpenApp('dictate'),
    },
    {
      title: 'Android Keyboard',
      subtitle: 'Native IME with voice dictation. Works in WhatsApp, Notes, and every app.',
      hint: 'Download APK',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <path d="M12 18h.01" />
        </svg>
      ),
      action: () => window.open('https://github.com/Majesticaxt/smart-dictation/releases', '_blank'),
    },
    {
      title: 'Dashboard',
      subtitle: 'View your stats, learned corrections, voice commands, and profile.',
      hint: 'View Stats',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      action: () => onOpenApp('dashboard'),
    },
  ];

  return (
    <div className="landing">
      <div className="landing-hero" />

      <header className="landing-header">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="landing-logo-text">Smart Dictation</span>
        </div>
        <nav className="landing-nav">
          <button onClick={() => onOpenApp('dictate')} className="landing-nav-link">Dictate</button>
          <button onClick={() => onOpenApp('dashboard')} className="landing-nav-link">Dashboard</button>
          <button onClick={() => onOpenApp('settings')} className="landing-nav-link">Settings</button>
          <button onClick={() => onOpenApp('profile')} className="landing-nav-link">Profile</button>
        </nav>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <span className="landing-chip">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" /></svg>
            AI-powered voice keyboard
          </span>
          <h1 className="landing-title">
            Speak it. <span className="landing-title-gradient">We'll clean it.</span>
          </h1>
          <p className="landing-subtitle">
            Smart Dictation turns messy speech into polished text — across the web, your phone, and your codebase.
          </p>
        </div>

        <section className="landing-cards">
          {surfaces.map((s, i) => (
            <button
              key={s.title}
              className="landing-card"
              onClick={s.action}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="landing-card-icon">{s.icon}</div>
              <h3 className="landing-card-title">{s.title}</h3>
              <p className="landing-card-desc">{s.subtitle}</p>
              <div className="landing-card-footer">
                <span className="landing-card-hint">{s.hint}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="landing-card-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <div className="landing-card-glow" />
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
