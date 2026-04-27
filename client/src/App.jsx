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

  // Handle voice correction commands
  speechRecognition.setOnCommand(({ action }) => {
    setText(prev => {
      switch (action) {
        case 'DELETE_LAST_SENTENCE': {
          // Remove everything after the last sentence-ending punctuation
          const match = prev.match(/^([\s\S]*[.?!])\s*[^.?!]*$/);
          const result = match ? match[1].trim() : '';
          showNotification('🗑️ Deleted last phrase');
          return result;
        }
        case 'DELETE_LAST_WORD': {
          // Remove the last word
          const result = prev.replace(/\s*\S+\s*$/, '');
          showNotification('🗑️ Deleted last word');
          return result;
        }
        case 'DELETE_LAST_CHUNK': {
          // Remove the last ~5 words
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

  // Start recording
  const handleStartRecording = useCallback(() => {
    setPreviousText(text);
    speechRecognition.start();
    incrementStat('totalDictations');
  }, [text, speechRecognition, incrementStat]);

  // Stop recording
  const handleStopRecording = useCallback(() => {
    speechRecognition.stop();
  }, [speechRecognition]);

  // Clean text — try AI first, fall back to local
  const handleClean = useCallback(async () => {
    if (!text.trim()) return;
    setIsCleaning(true);
    setPreviousText(text);

    try {
      const cleaned = await cleanTextWithAI(text);
      setText(cleaned);
      showNotification('✨ Text cleaned with AI');
    } catch (err) {
      // Fallback to local cleanup
      const { cleanedText, changes } = cleanTextLocally(text, profile);
      setText(cleanedText);
      showNotification(`🔧 Cleaned locally (${changes.length} fixes)`);
    }

    incrementStat('totalCleanups');
    setIsCleaning(false);
  }, [text, profile, incrementStat]);

  // Speak text
  const handleSpeak = useCallback(() => {
    if (text.trim()) speechSynthesis.speak(text);
  }, [text, speechSynthesis]);

  // Copy / Share — uses native share sheet on Android, clipboard on desktop
  const handleCopy = useCallback(async () => {
    if (!text.trim()) return;

    // Try native Web Share API first (Android Chrome, mobile)
    if (navigator.share) {
      try {
        await navigator.share({ text });
        showNotification('✅ Shared!');
        return;
      } catch (e) {
        // User cancelled share — don't show error
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text);
      showNotification('📋 Copied to clipboard!');
    } catch {
      showNotification('❌ Failed to copy');
    }
  }, [text]);

  // Detect corrections when user edits text
  const handleTextEdited = useCallback((before, after) => {
    const detected = detectCorrections(before, after);
    if (detected.length > 0) {
      setCorrections(detected);
    }
  }, []);

  // Save a learned correction
  const handleSaveCorrection = useCallback((correction) => {
    addCorrection(correction.original, correction.corrected);
    setCorrections(prev => prev.filter(c => c !== correction));
    showNotification(`🧠 Learned: "${correction.original}" → "${correction.corrected}"`);
  }, [addCorrection]);

  // Show temporary notification
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(() => ({
    'r': handleStartRecording,
    's': handleStopRecording,
    'Enter': handleClean,
    ' ': handleSpeak,
  }), [handleStartRecording, handleStopRecording, handleClean, handleSpeak]);

  useKeyboardShortcuts(shortcutHandlers);

  // Profile actions bundle for settings panel
  const profileActions = {
    addCorrection, removeCorrection, addFillerWord, removeFillerWord,
    addVocabulary, removeVocabulary, addPunctuationAlias, removePunctuationAlias,
    handleExport, handleImport, handleReset,
  };

  return (
    <div className="app">
      {/* Background effects */}
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

      {/* Main Content */}
      <main className="app-main">
        <div className="main-grid">
          {/* Left — Recording */}
          <RecordingPanel
            isListening={speechRecognition.isListening}
            interimText={speechRecognition.interimText}
            error={speechRecognition.error}
            isSupported={speechRecognition.isSupported}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
          />

          {/* Center — Text Editor */}
          <TextEditor
            text={text}
            setText={setText}
            previousText={previousText}
            onTextEdited={handleTextEdited}
          />

          {/* Right — Actions */}
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
