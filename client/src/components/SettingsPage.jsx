/**
 * SettingsPage — Voice commands, AI cleanup toggle, language selection.
 * Matches reference UI settings layout.
 */
export default function SettingsPage({ profile, onOpenSettings }) {
  const voiceCommands = [
    { phrase: 'comma', action: 'Insert ,' },
    { phrase: 'full stop', action: 'Insert .' },
    { phrase: 'question mark', action: 'Insert ?' },
    { phrase: 'new line', action: 'Line break' },
    { phrase: 'scratch that', action: 'Delete last phrase' },
    { phrase: 'delete last word', action: 'Remove last word' },
    { phrase: 'undo', action: 'Undo last 5 words' },
    { phrase: 'clear all', action: 'Clear everything' },
  ];

  return (
    <main className="page animate-fade-in">
      <h1 className="page-title" style={{ marginBottom: 20 }}>Settings</h1>

      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="settings-row-item">
          <div className="settings-row-icon">✨</div>
          <div className="settings-row-info">
            <p className="settings-row-name">AI cleanup</p>
            <p className="settings-row-desc">Polish punctuation, capitalization, and filler words.</p>
          </div>
          <span className="settings-badge settings-badge--on">ON</span>
        </div>
        <div className="settings-row-item">
          <div className="settings-row-icon">🌐</div>
          <div className="settings-row-info">
            <p className="settings-row-name">Language</p>
            <p className="settings-row-desc">Spoken language for transcription.</p>
          </div>
          <span className="settings-badge">English (US)</span>
        </div>
        <div className="settings-row-item">
          <div className="settings-row-icon">🎨</div>
          <div className="settings-row-info">
            <p className="settings-row-name">Dark theme</p>
            <p className="settings-row-desc">Easy on the eyes.</p>
          </div>
          <span className="settings-badge settings-badge--on">ON</span>
        </div>
        {onOpenSettings && (
          <button className="action-btn action-btn--glass" style={{ marginTop: 12, width: '100%' }} onClick={onOpenSettings}>
            ⚙️ Advanced Settings
          </button>
        )}
      </div>

      <p className="section-title" style={{ marginBottom: 8, marginTop: 24 }}>Voice commands</p>
      <div className="glass-card">
        {voiceCommands.map((c) => (
          <div key={c.phrase} className="command-item">
            <span className="command-icon">💬</span>
            <code className="command-phrase">"{c.phrase}"</code>
            <span className="command-action">{c.action}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
