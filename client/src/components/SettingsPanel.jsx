import { useState, useRef } from 'react';

/**
 * SettingsPanel — Modal for managing personal speech profile.
 * Tabs: Corrections, Filler Words, Vocabulary, Punctuation, Profile.
 */
export default function SettingsPanel({ isOpen, onClose, profile, profileActions }) {
  const [activeTab, setActiveTab] = useState('corrections');
  const [newCorrection, setNewCorrection] = useState({ from: '', to: '' });
  const [newFiller, setNewFiller] = useState('');
  const [newVocab, setNewVocab] = useState('');
  const [newAlias, setNewAlias] = useState({ spoken: '', symbol: '' });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const tabs = [
    { id: 'corrections', label: 'Corrections', icon: '✏️' },
    { id: 'fillers', label: 'Filler Words', icon: '🗑️' },
    { id: 'vocabulary', label: 'Vocabulary', icon: '📖' },
    { id: 'punctuation', label: 'Punctuation', icon: '❗' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
          </h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* CORRECTIONS TAB */}
          {activeTab === 'corrections' && (
            <div className="settings-section">
              <p className="settings-description">
                Add word corrections. When the app hears the "from" word, it'll auto-replace with the "to" word.
              </p>
              <div className="settings-add-row">
                <input
                  type="text"
                  placeholder='From (e.g. "gonna")'
                  value={newCorrection.from}
                  onChange={(e) => setNewCorrection(prev => ({ ...prev, from: e.target.value }))}
                  className="settings-input"
                />
                <span className="settings-arrow">→</span>
                <input
                  type="text"
                  placeholder='To (e.g. "going to")'
                  value={newCorrection.to}
                  onChange={(e) => setNewCorrection(prev => ({ ...prev, to: e.target.value }))}
                  className="settings-input"
                />
                <button
                  className="settings-add-btn"
                  onClick={() => {
                    if (newCorrection.from && newCorrection.to) {
                      profileActions.addCorrection(newCorrection.from, newCorrection.to);
                      setNewCorrection({ from: '', to: '' });
                    }
                  }}
                >+</button>
              </div>
              <div className="settings-list">
                {Object.entries(profile.corrections).map(([from, to]) => (
                  <div key={from} className="settings-list-item">
                    <span className="list-item-from">{from}</span>
                    <span className="list-item-arrow">→</span>
                    <span className="list-item-to">{to}</span>
                    <button className="list-item-delete" onClick={() => profileActions.removeCorrection(from)}>✕</button>
                  </div>
                ))}
                {Object.keys(profile.corrections).length === 0 && (
                  <p className="settings-empty">No corrections yet. They'll also be learned automatically when you edit text.</p>
                )}
              </div>
            </div>
          )}

          {/* FILLER WORDS TAB */}
          {activeTab === 'fillers' && (
            <div className="settings-section">
              <p className="settings-description">
                These words will be automatically removed during text cleanup.
              </p>
              <div className="settings-add-row">
                <input
                  type="text"
                  placeholder='Add filler word (e.g. "basically")'
                  value={newFiller}
                  onChange={(e) => setNewFiller(e.target.value)}
                  className="settings-input settings-input--wide"
                />
                <button
                  className="settings-add-btn"
                  onClick={() => {
                    if (newFiller) {
                      profileActions.addFillerWord(newFiller);
                      setNewFiller('');
                    }
                  }}
                >+</button>
              </div>
              <div className="settings-tags">
                {profile.fillerWords.map(word => (
                  <span key={word} className="settings-tag">
                    {word}
                    <button className="tag-delete" onClick={() => profileActions.removeFillerWord(word)}>✕</button>
                  </span>
                ))}
                {profile.fillerWords.length === 0 && (
                  <p className="settings-empty">No custom filler words. Default fillers (um, uh, like, etc.) are always removed.</p>
                )}
              </div>
            </div>
          )}

          {/* VOCABULARY TAB */}
          {activeTab === 'vocabulary' && (
            <div className="settings-section">
              <p className="settings-description">
                Protected words that the cleanup engine should never alter (names, technical terms, etc.).
              </p>
              <div className="settings-add-row">
                <input
                  type="text"
                  placeholder='Add word (e.g. "JavaScript")'
                  value={newVocab}
                  onChange={(e) => setNewVocab(e.target.value)}
                  className="settings-input settings-input--wide"
                />
                <button
                  className="settings-add-btn"
                  onClick={() => {
                    if (newVocab) {
                      profileActions.addVocabulary(newVocab);
                      setNewVocab('');
                    }
                  }}
                >+</button>
              </div>
              <div className="settings-tags">
                {profile.vocabulary.map(word => (
                  <span key={word} className="settings-tag settings-tag--vocab">
                    {word}
                    <button className="tag-delete" onClick={() => profileActions.removeVocabulary(word)}>✕</button>
                  </span>
                ))}
                {profile.vocabulary.length === 0 && (
                  <p className="settings-empty">No protected vocabulary words yet.</p>
                )}
              </div>
            </div>
          )}

          {/* PUNCTUATION TAB */}
          {activeTab === 'punctuation' && (
            <div className="settings-section">
              <p className="settings-description">
                Add custom punctuation voice commands beyond the built-in ones.
              </p>
              <div className="settings-add-row">
                <input
                  type="text"
                  placeholder='Say... (e.g. "dot")'
                  value={newAlias.spoken}
                  onChange={(e) => setNewAlias(prev => ({ ...prev, spoken: e.target.value }))}
                  className="settings-input"
                />
                <span className="settings-arrow">→</span>
                <input
                  type="text"
                  placeholder='Insert... (e.g. ".")'
                  value={newAlias.symbol}
                  onChange={(e) => setNewAlias(prev => ({ ...prev, symbol: e.target.value }))}
                  className="settings-input settings-input--small"
                />
                <button
                  className="settings-add-btn"
                  onClick={() => {
                    if (newAlias.spoken && newAlias.symbol) {
                      profileActions.addPunctuationAlias(newAlias.spoken, newAlias.symbol);
                      setNewAlias({ spoken: '', symbol: '' });
                    }
                  }}
                >+</button>
              </div>
              <div className="settings-list">
                {Object.entries(profile.punctuationAliases).map(([spoken, symbol]) => (
                  <div key={spoken} className="settings-list-item">
                    <span className="list-item-from">"{spoken}"</span>
                    <span className="list-item-arrow">→</span>
                    <span className="list-item-to">{symbol}</span>
                    <button className="list-item-delete" onClick={() => profileActions.removePunctuationAlias(spoken)}>✕</button>
                  </div>
                ))}
                {Object.keys(profile.punctuationAliases).length === 0 && (
                  <p className="settings-empty">No custom aliases. Built-in commands: "comma", "full stop", "question mark", etc.</p>
                )}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="settings-section">
              <div className="profile-stats">
                <h3 className="profile-stats-title">📊 Your Stats</h3>
                <div className="profile-stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{profile.stats.totalDictations}</span>
                    <span className="stat-label">Dictations</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{profile.stats.totalCleanups}</span>
                    <span className="stat-label">Cleanups</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{profile.stats.totalCorrectionsLearned}</span>
                    <span className="stat-label">Corrections Learned</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{profile.stats.wordsTranscribed}</span>
                    <span className="stat-label">Words Transcribed</span>
                  </div>
                </div>
              </div>

              <div className="profile-actions">
                <button className="profile-btn profile-btn--export" onClick={profileActions.handleExport}>
                  📥 Export Profile
                </button>
                <button className="profile-btn profile-btn--import" onClick={() => fileInputRef.current?.click()}>
                  📤 Import Profile
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      profileActions.handleImport(e.target.files[0]);
                    }
                  }}
                />
                <button className="profile-btn profile-btn--reset" onClick={() => {
                  if (window.confirm('Reset all settings and learned corrections? This cannot be undone.')) {
                    profileActions.handleReset();
                  }
                }}>
                  🗑️ Reset Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
