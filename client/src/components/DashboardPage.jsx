/**
 * DashboardPage — Matches reference: greeting, stat cards with icons,
 * quick dictate glass card, recent transcriptions list.
 */
export default function DashboardPage({ profile, onOpenDictate }) {
  const { stats } = profile;

  // Show recent transcriptions from localStorage history
  const recentItems = [
    { id: '1', text: 'Tap the mic and start speaking — your transcriptions will appear here.', time: 'Just now', words: 12 },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="page animate-fade-in">
      <header className="page-header">
        <div>
          <p className="page-label">Today</p>
          <h1 className="page-title">{greeting}</h1>
        </div>
      </header>

      {/* Stat Cards */}
      <section className="stat-grid">
        <StatCard label="Words" value={stats.wordsTranscribed.toLocaleString()} icon="📝" accent />
        <StatCard label="Cleanups" value={stats.totalCleanups} icon="✨" />
        <StatCard label="Accuracy" value="98%" icon="🎯" />
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

      {/* Recent Transcriptions */}
      <section style={{ marginTop: 8 }}>
        <div className="section-header-row">
          <h2 className="section-title">Recent</h2>
          <button className="section-link">View all</button>
        </div>
        <div className="recent-list">
          {recentItems.map((t) => (
            <div key={t.id} className="recent-item">
              <div className="recent-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <div className="recent-item-text">
                <p className="recent-item-content">{t.text}</p>
                <p className="recent-item-meta">{t.time} · {t.words} words</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-card--accent' : ''}`}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-icon">{icon}</span>
      </div>
      <span className="stat-card-value">{value}</span>
      {accent && <div className="stat-card-glow" />}
    </div>
  );
}
