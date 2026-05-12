import RecordingPanel from './RecordingPanel';
import TextEditor from './TextEditor';
import ShortcutBar from './ShortcutBar';

/**
 * DictatePage — Matches reference: centered mic, language chip with chevron,
 * voice commands green pill when active, glass transcript, 4 gradient action buttons.
 */
export default function DictatePage({
  speechRecognition, text, setText, previousText,
  isCleaning, onStartRecording, onStopRecording,
  onClean, onSpeak, onCopy, onClear, onUndo,
  onLearnCorrection, corrections, profile,
}) {
  const isActive = speechRecognition.isListening;

  return (
    <main className="page animate-fade-in">
      <header className="page-header">
        <h1 className="page-title">Dictate</h1>
        <button className="lang-chip">
          🌐 English (US)
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </header>

      {/* Mic Area */}
      <div className="dictate-mic-area">
        <RecordingPanel
          isListening={isActive}
          interimText={speechRecognition.interimText}
          error={speechRecognition.error}
          isSupported={speechRecognition.isSupported}
          onStart={onStartRecording}
          onStop={onStopRecording}
        />
        <p className="dictate-hint">
          {isActive ? 'Listening… speak clearly' : 'Tap to start dictating'}
        </p>
        {isActive && (
          <span className="voice-commands-pill">
            <span className="voice-commands-dot" />
            Voice commands: comma · full stop · scratch that
          </span>
        )}
      </div>

      {/* Live Transcript */}
      <div className="glass-card">
        <p className="glass-card-label">Live transcript</p>
        <TextEditor
          text={text}
          setText={setText}
          previousText={previousText}
        />
      </div>

      {/* Action Buttons — matches reference 4-column grid */}
      <div className="dictate-actions">
        <button className="action-btn action-btn--primary" onClick={onClean} disabled={isCleaning || !text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" /></svg>
          {isCleaning ? 'Cleaning…' : 'Clean'}
        </button>
        <button className="action-btn action-btn--success" onClick={onCopy} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          Insert
        </button>
        <button className="action-btn action-btn--glass" onClick={onSpeak} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Copy
        </button>
        <button className="action-btn action-btn--danger" onClick={onClear} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Clear
        </button>
      </div>

      <ShortcutBar />
    </main>
  );
}
