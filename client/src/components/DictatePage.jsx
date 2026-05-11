import RecordingPanel from './RecordingPanel';
import TextEditor from './TextEditor';
import ActionBar from './ActionBar';
import ShortcutBar from './ShortcutBar';

/**
 * DictatePage — Main dictation view with mic, editor, and action buttons.
 * Matches reference UI: centered mic, glass card transcript, gradient action buttons.
 */
export default function DictatePage({
  speechRecognition, text, setText, previousText,
  isCleaning, onStartRecording, onStopRecording,
  onClean, onSpeak, onCopy, onClear, onUndo,
  onLearnCorrection, corrections, profile,
}) {
  return (
    <main className="page animate-fade-in">
      <header className="page-header">
        <h1 className="page-title">Dictate</h1>
        <span className="page-chip">
          🌐 English (US)
        </span>
      </header>

      {/* Mic Area */}
      <div className="dictate-mic-area">
        <RecordingPanel
          isListening={speechRecognition.isListening}
          interimText={speechRecognition.interimText}
          error={speechRecognition.error}
          isSupported={speechRecognition.isSupported}
          onStart={onStartRecording}
          onStop={onStopRecording}
        />
      </div>

      {/* Live Transcript */}
      <div className="glass-card">
        <p className="glass-card-label">Live transcript</p>
        <TextEditor
          text={text}
          previousText={previousText}
          onTextChange={setText}
          corrections={corrections}
          onLearnCorrection={onLearnCorrection}
        />
      </div>

      {/* Action Buttons */}
      <div className="dictate-actions">
        <button className="action-btn action-btn--primary" onClick={onClean} disabled={isCleaning || !text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" /></svg>
          {isCleaning ? 'Cleaning...' : 'Clean'}
        </button>
        <button className="action-btn action-btn--success" onClick={() => { navigator.clipboard.writeText(text); }} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          Copy
        </button>
        <button className="action-btn action-btn--glass" onClick={onSpeak} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          Speak
        </button>
        <button className="action-btn action-btn--danger" onClick={onClear} disabled={!text.trim()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Clear
        </button>
      </div>

      {/* Shortcuts hint */}
      <ShortcutBar />
    </main>
  );
}
