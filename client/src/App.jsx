import { useState, useCallback, useMemo } from 'react';
import RecordingPanel from './components/RecordingPanel';
import TextEditor from './components/TextEditor';
import ActionBar from './components/ActionBar';
import SettingsPanel from './components/SettingsPanel';
import ShortcutBar from './components/ShortcutBar';
import CorrectionToast from './components/CorrectionToast';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProfile } from './hooks/useProfile';
import { cleanTextWithAI } from './utils/api';
import { cleanTextLocally } from './utils/cleanupEngine';
import { detectCorrections } from './utils/diffDetector';

export default function App() {
  const [text, setText] = useState('');
  const [previousText, setPreviousText] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('dictate'); // 'dictate' | 'dashboard'

  // Hooks
  const {
    profile, addCorrection, removeCorrection, addFillerWord, removeFillerWord,
    addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias,
    updateTTSSettings, incrementStat, handleExport, handleImport, handleReset,
  } = useProfile();

  const speechRecognition = useSpeechRecognition(profile.punctuationAliases);
  const speechSynthesis = useSpeechSynthesis();

  // When speech recognition produces final text, append to editor
  speechRecognition.setOnResult((finalText) => {
    setText(prev => {
      const separator = prev && !prev.endsWith('\n') && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + finalText;
    });
    incrementStat('wordsTranscribed', finalText.split(/\s+/).length);
  });

  // When Android sends a progressive extension, REPLACE the last result
  speechRecognition.setOnReplace((oldText, newText) => {
    setText(prev => {
      const idx = prev.lastIndexOf(oldText);
      if (idx !== -1) {
        return prev.substring(0, idx) + newText + prev.substring(idx + oldText.length);
      }
      const separator = prev && !prev.endsWith('\n') && !prev.endsWith(' ') ? ' ' : '';
      return prev + separator + newText;
    });
  });

  // Handle voice correction commands
  speechRecognition.setOnCommand(({ action }) => {
    setText(prev => {
      switch (action) {
        case 'DELETE_LAST_SENTENCE': {
          const match = prev.match(/^([\s\S]*[.?!])\s*[^.?!]*$/);
          const result = match ? match[1].trim() : '';
          showNotification('🗑️ Deleted last phrase');
          return result;
        }
        case 'DELETE_LAST_WORD': {
          const result = prev.replace(/\s*\S+\s*$/, '');
          showNotification('🗑️ Deleted last word');
          return result;
        }
        case 'DELETE_LAST_CHUNK': {
          const words = prev.trimEnd().split(/\s+/);
          const result = words.slice(0, Math.max(0, words.length - 5)).join(' ');
          showNotification('↩️ Undid last chunk');
          return result;
        }
        case 'CLEAR_ALL': {
          showNotification('🗑️ Cleared all text');
          return '';
        }
        default:
          return prev;
      }
    });
  });

  const handleStartRecording = useCallback(() => {
    setPreviousText(text);
    speechRecognition.start();
    incrementStat('totalDictations');
  }, [text, speechRecognition, incrementStat]);

  const handleStopRecording = useCallback(() => {
    speechRecognition.stop();
  }, [speechRecognition]);

  const handleClean = useCallback(async () => {
    if (!text.trim()) return;
    setIsCleaning(true);
    setPreviousText(text);

    try {
      const cleaned = await cleanTextWithAI(text);
      setText(cleaned);
      showNotification('✨ Text cleaned with AI');
    } catch (err) {
      const { cleanedText, changes } = cleanTextLocally(text, profile);
      setText(cleanedText);
      showNotification(`🔧 Cleaned locally (${changes.length} fixes)`);
    }

    incrementStat('totalCleanups');
    setIsCleaning(false);
  }, [text, profile, incrementStat]);

  const handleSpeak = useCallback(() => {
    if (text.trim()) speechSynthesis.speak(text);
  }, [text, speechSynthesis]);

  const handleCopy = useCallback(async () => {
    if (!text.trim()) return;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        showNotification('✅ Shared!');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      showNotification('📋 Copied to clipboard!');
    } catch {
      showNotification('❌ Failed to copy');
    }
  }, [text]);

  const handleTextEdited = useCallback((before, after) => {
    const detected = detectCorrections(before, after);
    if (detected.length > 0) {
      setCorrections(detected);
    }
  }, []);

  const handleSaveCorrection = useCallback((correction) => {
    addCorrection(correction.original, correction.corrected);
    setCorrections(prev => prev.filter(c => c !== correction));
    showNotification(`🧠 Learned: "${correction.original}" → "${correction.corrected}"`);
  }, [addCorrection]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const shortcutHandlers = useMemo(() => ({
    'r': handleStartRecording,
    's': handleStopRecording,
    'Enter': handleClean,
    ' ': handleSpeak,
  }), [handleStartRecording, handleStopRecording, handleClean, handleSpeak]);

  useKeyboardShortcuts(shortcutHandlers);

  const profileActions = {
    addCorrection, removeCorrection, addFillerWord, removeFillerWord,
    addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias,
    handleExport, handleImport, handleReset,
  };

  return (
    <div className="app">
      <div className="bg-gradient" />
      <div className="bg-grid" />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="title-icon">🎙️</span>
            Smart Dictation
          </h1>
          <span className="app-badge">AI-Powered</span>
        </div>
        <button
          id="settings-btn"
          className="settings-trigger"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>

      {/* Mobile Tab Navigation */}
      <nav className="mobile-tabs">
        <button
          className={`mobile-tab ${activeTab === 'dictate' ? 'mobile-tab--active' : ''}`}
          onClick={() => setActiveTab('dictate')}
        >
          <span className="mobile-tab-icon">🎤</span>
          <span>Dictate</span>
        </button>
        <button
          className={`mobile-tab ${activeTab === 'dashboard' ? 'mobile-tab--active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <span className="mobile-tab-icon">📊</span>
          <span>Dashboard</span>
        </button>
      </nav>

      {/* Main Content — Dictate Tab */}
      {activeTab === 'dictate' && (
        <main className="app-main">
          <div className="main-grid">
            <RecordingPanel
              isListening={speechRecognition.isListening}
              interimText={speechRecognition.interimText}
              error={speechRecognition.error}
              isSupported={speechRecognition.isSupported}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
            />
            <TextEditor
              text={text}
              setText={setText}
              previousText={previousText}
              onTextEdited={handleTextEdited}
            />
            <ActionBar
              text={text}
              isCleaning={isCleaning}
              isSpeaking={speechSynthesis.isSpeaking}
              onClean={handleClean}
              onSpeak={handleSpeak}
              onStopSpeaking={speechSynthesis.stopSpeaking}
              onCopy={handleCopy}
              voices={speechSynthesis.voices}
              selectedVoice={speechSynthesis.selectedVoice}
              onVoiceChange={speechSynthesis.setVoiceByName}
              rate={speechSynthesis.rate}
              pitch={speechSynthesis.pitch}
              onRateChange={speechSynthesis.setRate}
              onPitchChange={speechSynthesis.setPitch}
            />
          </div>
        </main>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <main className="app-main">
          <div className="dashboard">
            {/* Stats Overview */}
            <section className="dash-section">
              <h2 className="dash-section-title">
                <span>📊</span> Your Stats
              </h2>
              <div className="dash-stats-grid">
                <div className="dash-stat-card">
                  <span className="dash-stat-value">{profile.stats.totalDictations}</span>
                  <span className="dash-stat-label">Dictations</span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-value">{profile.stats.wordsTranscribed}</span>
                  <span className="dash-stat-label">Words</span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-value">{profile.stats.totalCleanups}</span>
                  <span className="dash-stat-label">AI Cleanups</span>
                </div>
                <div className="dash-stat-card">
                  <span className="dash-stat-value">{profile.stats.totalCorrectionsLearned}</span>
                  <span className="dash-stat-label">Learned</span>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <section className="dash-section">
              <h2 className="dash-section-title">
                <span>⚡</span> Quick Actions
              </h2>
              <div className="dash-actions-grid">
                <button className="dash-action-card" onClick={() => { setActiveTab('dictate'); setTimeout(handleStartRecording, 300); }}>
                  <span className="dash-action-icon">🎤</span>
                  <span className="dash-action-label">Start Dictating</span>
                </button>
                <button className="dash-action-card" onClick={() => setSettingsOpen(true)}>
                  <span className="dash-action-icon">⚙️</span>
                  <span className="dash-action-label">Settings</span>
                </button>
                <button className="dash-action-card" onClick={profileActions.handleExport}>
                  <span className="dash-action-icon">📥</span>
                  <span className="dash-action-label">Export Profile</span>
                </button>
                <button className="dash-action-card" onClick={() => {
                  if (window.confirm('Reset all settings?')) profileActions.handleReset();
                }}>
                  <span className="dash-action-icon">🔄</span>
                  <span className="dash-action-label">Reset</span>
                </button>
              </div>
            </section>

            {/* Learned Corrections */}
            <section className="dash-section">
              <h2 className="dash-section-title">
                <span>🧠</span> Learned Corrections
                <span className="dash-count">{Object.keys(profile.corrections).length}</span>
              </h2>
              {Object.keys(profile.corrections).length > 0 ? (
                <div className="dash-list">
                  {Object.entries(profile.corrections).slice(0, 10).map(([from, to]) => (
                    <div key={from} className="dash-list-item">
                      <span className="dash-list-from">{from}</span>
                      <span className="dash-list-arrow">→</span>
                      <span className="dash-list-to">{to}</span>
                    </div>
                  ))}
                  {Object.keys(profile.corrections).length > 10 && (
                    <p className="dash-more">and {Object.keys(profile.corrections).length - 10} more…</p>
                  )}
                </div>
              ) : (
                <p className="dash-empty">No corrections learned yet. Edit text after dictation to teach the app.</p>
              )}
            </section>

            {/* Voice Commands Help */}
            <section className="dash-section">
              <h2 className="dash-section-title">
                <span>💬</span> Voice Commands
              </h2>
              <div className="dash-list">
                <div className="dash-list-item"><span className="dash-list-from">"scratch that"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Delete last phrase</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"delete last word"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Delete last word</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"undo"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Undo last 5 words</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"clear all"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Clear everything</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"comma"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Insert ,</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"full stop"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Insert .</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"question mark"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Insert ?</span></div>
                <div className="dash-list-item"><span className="dash-list-from">"new line"</span><span className="dash-list-arrow">→</span><span className="dash-list-to">Line break</span></div>
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Notification */}
      {notification && (
        <div className="notification">{notification}</div>
      )}

      {/* Correction Toast */}
      <CorrectionToast
        corrections={corrections}
        onSave={handleSaveCorrection}
        onDismiss={() => setCorrections([])}
      />

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        profileActions={profileActions}
      />

      {/* Shortcut Bar */}
      <ShortcutBar />
    </div>
  );
}
