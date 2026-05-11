import { useState, useCallback, useMemo } from 'react';
import LandingPage from './components/LandingPage';
import DictatePage from './components/DictatePage';
import DashboardPage from './components/DashboardPage';
import SettingsPanel from './components/SettingsPanel';
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
  const [activeTab, setActiveTab] = useState('landing');

  // Hooks
  const {
    profile, addCorrection, removeCorrection, addFillerWord, removeFillerWord,
    addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias,
    updateTTSSettings, incrementStat, handleExport, handleImport, handleReset,
  } = useProfile();

  const speechRecognition = useSpeechRecognition(text, setText, profile);
  const { speak } = useSpeechSynthesis(profile.ttsSettings);

  // Handlers
  const handleStartRecording = useCallback(() => {
    speechRecognition.start();
    incrementStat('totalDictations');
  }, [speechRecognition, incrementStat]);

  const handleStopRecording = useCallback(() => {
    speechRecognition.stop();
  }, [speechRecognition]);

  const handleClean = useCallback(async () => {
    if (!text.trim() || isCleaning) return;
    setIsCleaning(true);
    setPreviousText(text);
    try {
      const cleaned = await cleanTextWithAI(text, profile);
      const localCleaned = cleanTextLocally(cleaned, profile);
      const detected = detectCorrections(text, localCleaned, profile);
      setCorrections(detected);
      setText(localCleaned);
      incrementStat('totalCleanups');
      showNotification('✨ Text cleaned with AI');
    } catch {
      const localOnly = cleanTextLocally(text, profile);
      setText(localOnly);
      showNotification('🔧 Cleaned locally (API unavailable)');
    } finally {
      setIsCleaning(false);
    }
  }, [text, isCleaning, profile, incrementStat]);

  const handleSpeak = useCallback(() => { if (text.trim()) speak(text); }, [text, speak]);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    showNotification('📋 Copied to clipboard');
  }, [text]);
  const handleClear = useCallback(() => { setPreviousText(text); setText(''); }, [text]);
  const handleUndo = useCallback(() => { if (previousText) { setText(previousText); setPreviousText(''); } }, [previousText]);

  const handleLearnCorrection = useCallback((correction) => {
    addCorrection(correction);
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

  // ── Landing page (full screen, no shell) ──
  if (activeTab === 'landing') {
    return <LandingPage onOpenApp={(tab) => setActiveTab(tab)} />;
  }

  // ── App shell with bottom nav ──
  return (
    <div className="app-shell">
      <div className="bg-gradient" />

      {/* Top Bar */}
      <header className="topbar">
        <button className="topbar-back" onClick={() => setActiveTab('landing')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="topbar-brand">
          <div className="topbar-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </div>
          <span className="topbar-title">Smart Dictation</span>
        </div>
        <button className="topbar-settings" onClick={() => setSettingsOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </header>

      {/* Page Content */}
      {activeTab === 'dictate' && (
        <DictatePage
          speechRecognition={speechRecognition}
          text={text}
          setText={setText}
          previousText={previousText}
          isCleaning={isCleaning}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onClean={handleClean}
          onSpeak={handleSpeak}
          onCopy={handleCopy}
          onClear={handleClear}
          onUndo={handleUndo}
          onLearnCorrection={handleLearnCorrection}
          corrections={corrections}
          profile={profile}
        />
      )}

      {activeTab === 'dashboard' && (
        <DashboardPage
          profile={profile}
          onOpenDictate={() => setActiveTab('dictate')}
        />
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className={`bottom-nav-item ${activeTab === 'dictate' ? 'bottom-nav-item--active' : ''}`} onClick={() => setActiveTab('dictate')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          <span>Dictate</span>
        </button>
        <button className={`bottom-nav-item ${activeTab === 'dashboard' ? 'bottom-nav-item--active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>Dashboard</span>
        </button>
        <button className={`bottom-nav-item ${activeTab === 'settings' ? 'bottom-nav-item--active' : ''}`} onClick={() => setSettingsOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>

      {/* Notification Toast */}
      {notification && <div className="toast">{notification}</div>}

      {/* Settings Modal */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        actions={profileActions}
        ttsSettings={profile.ttsSettings}
        onTTSChange={updateTTSSettings}
      />

      <CorrectionToast corrections={corrections} onDismiss={() => setCorrections([])} onLearn={handleLearnCorrection} />
    </div>
  );
}
