/**
 * ActionBar — Clean, Read Aloud, Copy buttons + voice settings.
 */
export default function ActionBar({
  text,
  isCleaning,
  isSpeaking,
  onClean,
  onSpeak,
  onStopSpeaking,
  onCopy,
  voices,
  selectedVoice,
  onVoiceChange,
  rate,
  pitch,
  onRateChange,
  onPitchChange,
}) {
  const hasText = text && text.trim().length > 0;

  return (
    <div className="action-bar">
      <div className="action-bar__buttons">
        {/* Clean Text */}
        <button
          id="clean-text-btn"
          className="action-btn action-btn--clean"
          onClick={onClean}
          disabled={!hasText || isCleaning}
          title="Clean text with AI (Enter)"
        >
          {isCleaning ? (
            <span className="btn-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
            </svg>
          )}
          <span>{isCleaning ? 'Cleaning...' : 'Clean Text'}</span>
        </button>

        {/* Read Aloud / Stop */}
        <button
          id="speak-btn"
          className={`action-btn action-btn--speak ${isSpeaking ? 'action-btn--speaking' : ''}`}
          onClick={isSpeaking ? onStopSpeaking : onSpeak}
          disabled={!hasText}
          title={isSpeaking ? 'Stop speaking' : 'Read aloud (Space)'}
        >
          {isSpeaking ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          <span>{isSpeaking ? 'Stop' : 'Read Aloud'}</span>
        </button>

        {/* Copy */}
        <button
          id="copy-btn"
          className="action-btn action-btn--copy"
          onClick={onCopy}
          disabled={!hasText}
          title="Copy to clipboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>Copy</span>
        </button>
      </div>

      {/* Voice Settings */}
      <div className="action-bar__voice-settings">
        <div className="voice-select-group">
          <label htmlFor="voice-select" className="voice-label">Voice</label>
          <select
            id="voice-select"
            className="voice-select"
            value={selectedVoice?.name || ''}
            onChange={(e) => onVoiceChange(e.target.value)}
          >
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="slider-group">
          <label className="slider-label">
            Speed: {rate.toFixed(1)}x
          </label>
          <input
            type="range"
            className="slider"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
          />
        </div>

        <div className="slider-group">
          <label className="slider-label">
            Pitch: {pitch.toFixed(1)}
          </label>
          <input
            type="range"
            className="slider"
            min="0.5"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
}
