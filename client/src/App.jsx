import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import DictatePage from './components/DictatePage';
import DashboardPage from './components/DashboardPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import SettingsPanel from './components/SettingsPanel';
import CorrectionToast from './components/CorrectionToast';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProfile } from './hooks/useProfile';
import { cleanTextWithAI } from './utils/api';
import { cleanTextLocally } from './utils/cleanupEngine';
import { detectCorrections } from './utils/diffDetector';

const MicIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;

export default function App() {
  const [text, setText] = useState('');
  const [previousText, setPreviousText] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('landing');

  const {
    profile, addCorrection, removeCorrection, addFillerWord, removeFillerWord,
    addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias,
    updateTTSSettings, incrementStat, handleExport, handleImport, handleReset,
  } = useProfile();

  const speechRecognition = useSpeechRecognition(profile.punctuationAliases || {});
  const { speak } = useSpeechSynthesis(profile.ttsSettings);

  // Wire up speech recognition callbacks to update text state
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    speechRecognition.setOnResult((processed) => {
      setText(prev => {
        const separator = prev && !prev.endsWith('\n') ? ' ' : '';
        const updated = prev + separator + processed;
        incrementStat('wordsTranscribed', processed.trim().split(/\s+/).length);
        return updated;
      });
    });
  }, [speechRecognition, incrementStat]);

  useEffect(() => {
    speechRecognition.setOnReplace((oldText, newText) => {
      setText(prev => prev.replace(oldText, newText));
    });
  }, [speechRecognition]);

  useEffect(() => {
    speechRecognition.setOnCommand((command) => {
      switch (command.action) {
        case 'DELETE_LAST_SENTENCE':
          setText(prev => prev.replace(/[^.!?]*[.!?]?\s*$/, '').trim());
          break;
        case 'DELETE_LAST_WORD':
          setText(prev => prev.replace(/\s*\S+\s*$/, ''));
          break;
        case 'DELETE_LAST_CHUNK':
          setText(prev => prev.split(/\s+/).slice(0, -5).join(' '));
          break;
        case 'CLEAR_ALL':
          setPreviousText(textRef.current);
          setText('');
          break;
        default: break;
      }
    });
  }, [speechRecognition]);

  const handleStartRecording = useCallback(() => { speechRecognition.start(); incrementStat('totalDictations'); }, [speechRecognition, incrementStat]);
  const handleStopRecording = useCallback(() => { speechRecognition.stop(); }, [speechRecognition]);
  const handleClean = useCallback(async () => {
    if (!text.trim() || isCleaning) return;
    setIsCleaning(true); setPreviousText(text);
    try {
      const cleaned = await cleanTextWithAI(text, profile);
      const { cleanedText } = cleanTextLocally(cleaned, profile);
      setCorrections(detectCorrections(text, cleanedText, profile));
      setText(cleanedText); incrementStat('totalCleanups');
      showNotification('✨ Text cleaned with AI');
    } catch {
      const { cleanedText } = cleanTextLocally(text, profile);
      setText(cleanedText);
      showNotification('🔧 Cleaned locally');
    }
    finally { setIsCleaning(false); }
  }, [text, isCleaning, profile, incrementStat]);
  const handleSpeak = useCallback(() => { if (text.trim()) speak(text); }, [text, speak]);
  const handleClear = useCallback(() => { setPreviousText(text); setText(''); }, [text]);
  const handleUndo = useCallback(() => { if (previousText) { setText(previousText); setPreviousText(''); } }, [previousText]);
  const handleLearnCorrection = useCallback((c) => { addCorrection(c); showNotification(`🧠 Learned: "${c.original}" → "${c.corrected}"`); }, [addCorrection]);
  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  useKeyboardShortcuts(useMemo(() => ({ 'r': handleStartRecording, 's': handleStopRecording, 'Enter': handleClean, ' ': handleSpeak }), [handleStartRecording, handleStopRecording, handleClean, handleSpeak]));

  const profileActions = { addCorrection, removeCorrection, addFillerWord, removeFillerWord, addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias, handleExport, handleImport, handleReset };

  // ── Landing (full screen) ──
  if (activeTab === 'landing') return <LandingPage onOpenApp={(tab) => setActiveTab(tab)} />;

  // ── App Shell: sidebar + bottom nav ──
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: '📊' },
    { id: 'dictate', label: 'Dictate', icon: '🎤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="app-shell">
      <div className="bg-gradient" />

      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <button className="sidebar-brand" onClick={() => setActiveTab('landing')}>
          <div className="sidebar-logo"><MicIcon /></div>
          <span className="sidebar-title">Smart Dictation</span>
        </button>
        <nav className="sidebar-nav">
          {tabs.map(t => (
            <button key={t.id}
              className={`sidebar-link ${activeTab === t.id ? 'sidebar-link--active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              <span className="sidebar-link-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="sidebar-back" onClick={() => setActiveTab('landing')}>
          ← All surfaces
        </button>
      </aside>

      {/* Page Content */}
      <div className="app-content">
        {activeTab === 'dictate' && (
          <DictatePage
            speechRecognition={speechRecognition} text={text} setText={setText}
            previousText={previousText} isCleaning={isCleaning}
            onStartRecording={handleStartRecording} onStopRecording={handleStopRecording}
            onClean={handleClean} onSpeak={handleSpeak} onCopy={() => { navigator.clipboard.writeText(text); showNotification('📋 Copied'); }}
            onClear={handleClear} onUndo={handleUndo}
            onLearnCorrection={handleLearnCorrection} corrections={corrections} profile={profile}
          />
        )}
        {activeTab === 'dashboard' && <DashboardPage profile={profile} onOpenDictate={() => setActiveTab('dictate')} />}
        {activeTab === 'settings' && <SettingsPage profile={profile} onOpenSettings={() => setAdvancedSettingsOpen(true)} />}
        {activeTab === 'profile' && <ProfilePage profile={profile} onExport={handleExport} onImport={handleImport} onReset={handleReset} />}
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav">
        {tabs.map(t => (
          <button key={t.id}
            className={`bottom-nav-item ${activeTab === t.id ? 'bottom-nav-item--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {notification && <div className="toast">{notification}</div>}
      <SettingsPanel isOpen={advancedSettingsOpen} onClose={() => setAdvancedSettingsOpen(false)} profile={profile} actions={profileActions} ttsSettings={profile.ttsSettings} onTTSChange={updateTTSSettings} />
      <CorrectionToast corrections={corrections} onDismiss={() => setCorrections([])} onLearn={handleLearnCorrection} />
    </div>
  );
}
