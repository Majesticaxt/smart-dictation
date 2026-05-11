/**
 * ProfilePage — User profile, stats summary, corrections learned.
 * Matches reference UI profile layout.
 */
export default function ProfilePage({ profile, onExport, onImport, onReset }) {
  const { stats } = profile;

  return (
    <main className="page animate-fade-in">
      <h1 className="page-title" style={{ marginBottom: 20 }}>Profile</h1>

      {/* Avatar Card */}
      <div className="glass-card profile-card">
        <div className="profile-avatar">
          {(profile.name || 'U').charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <p className="profile-name">{profile.name || 'User'}</p>
          <p className="profile-email">Smart Dictation User</p>
        </div>
        <span className="profile-plan">Free</span>
      </div>

      {/* Stats Row */}
      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
          <p className="stat-card-label">Words</p>
          <p className="stat-card-value">{stats.wordsTranscribed.toLocaleString()}</p>
        </div>
        <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
          <p className="stat-card-label">Cleanups</p>
          <p className="stat-card-value">{stats.totalCleanups}</p>
        </div>
        <div className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
          <p className="stat-card-label">Learned</p>
          <p className="stat-card-value">{stats.totalCorrectionsLearned}</p>
        </div>
      </div>

      {/* Corrections */}
      {profile.corrections.length > 0 && (
        <div className="glass-card" style={{ marginTop: 16 }}>
          <p className="section-title" style={{ marginBottom: 10 }}>Learned Corrections</p>
          <div className="commands-list">
            {profile.corrections.map((c, i) => (
              <div key={i} className="command-item">
                <span className="command-from">{c.original}</span>
                <span className="command-arrow">→</span>
                <span className="command-to">{c.corrected}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="action-btn action-btn--glass" style={{ width: '100%' }} onClick={onExport}>📥 Export Profile</button>
        <label className="action-btn action-btn--glass" style={{ width: '100%', cursor: 'pointer', textAlign: 'center' }}>
          📤 Import Profile
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
        </label>
        <button className="action-btn action-btn--danger" style={{ width: '100%' }} onClick={onReset}>🗑️ Reset All Data</button>
      </div>
    </main>
  );
}
