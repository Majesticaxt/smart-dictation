/**
 * DashboardPage — Stats overview + recent activity + voice commands.
 * Matches reference UI: stat cards with icons, glass sections, fade-in animation.
 */
export default function DashboardPage({ profile, onOpenDictate }) {
  const { stats } = profile;

  return (
    <main className="page animate-fade-in">
      <header className="page-header">
        <div>
          <p className="page-label">Today</p>
          <h1 className="page-title">Dashboard</h1>
        </div>
      </header>

      {/* Stat Cards */}
      <section className="stat-grid">
        <div className="stat-card stat-card--accent">
          <div className="stat-card-top">
            <span className="stat-card-label">Dictations</span>
            <span className="stat-card-icon">🎤</span>
          </div>
          <span className="stat-card-value">{stats.totalDictations}</span>
          <div className="stat-card-glow" />
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Words</span>
            <span className="stat-card-icon">📝</span>
          </div>
          <span className="stat-card-value">{stats.wordsTranscribed.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">AI Cleanups</span>
            <span className="stat-card-icon">✨</span>
          </div>
          <span className="stat-card-value">{stats.totalCleanups}</span>
        </div>
      </section>

      {/* Quick Dictate */}
      <div className="glass-card quick-dictate" onClick={onOpenDictate}>
        <div className="quick-dictate-mic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>
        <div className="quick-dictate-text">
          <p className="quick-dictate-title">Quick dictate</p>
          <p className="quick-dictate-desc">Tap the mic and start speaking — we'll clean it up.</p>
        </div>
        <span className="quick-dictate-btn">Open</span>
      </div>

      {/* Voice Commands */}
      <section className="glass-card" style={{ animationDelay: '0.2s' }}>
        <div className="section-header">
          <h2 className="section-title">Voice Commands</h2>
        </div>
        <div className="commands-list">
          {[
            { phrase: 'comma', action: 'Insert ,' },
            { phrase: 'full stop', action: 'Insert .' },
            { phrase: 'question mark', action: 'Insert ?' },
            { phrase: 'new line', action: 'Line break' },
            { phrase: 'scratch that', action: 'Delete last phrase' },
            { phrase: 'delete last word', action: 'Remove last word' },
            { phrase: 'undo', action: 'Undo last 5 words' },
            { phrase: 'clear all', action: 'Clear everything' },
          ].map((c) => (
            <div key={c.phrase} className="command-item">
              <span className="command-icon">💬</span>
              <code className="command-phrase">"{c.phrase}"</code>
              <span className="command-action">{c.action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Learned Corrections */}
      {profile.corrections.length > 0 && (
        <section className="glass-card" style={{ animationDelay: '0.3s' }}>
          <div className="section-header">
            <h2 className="section-title">Learned Corrections</h2>
            <span className="section-badge">{profile.corrections.length}</span>
          </div>
          <div className="commands-list">
            {profile.corrections.slice(0, 8).map((c, i) => (
              <div key={i} className="command-item">
                <span className="command-from">{c.original}</span>
                <span className="command-arrow">→</span>
                <span className="command-to">{c.corrected}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
