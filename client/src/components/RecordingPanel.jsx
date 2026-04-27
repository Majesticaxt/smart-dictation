import { useEffect, useRef } from 'react';

/**
 * RecordingPanel — Microphone button with animated state indicator.
 */
export default function RecordingPanel({ isListening, interimText, error, isSupported, onStart, onStop }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Pulse animation when listening
  useEffect(() => {
    if (!isListening || !canvasRef.current) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 200;
    const h = canvas.height = 200;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      phase += 0.03;

      // Draw animated rings
      for (let i = 0; i < 3; i++) {
        const radius = 40 + i * 20 + Math.sin(phase + i * 0.8) * 8;
        const alpha = 0.3 - i * 0.08;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw waveform bars
      const bars = 12;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const barHeight = 8 + Math.sin(phase * 2 + i * 0.5) * 12;
        const innerR = 30;
        const x1 = w / 2 + Math.cos(angle) * innerR;
        const y1 = h / 2 + Math.sin(angle) * innerR;
        const x2 = w / 2 + Math.cos(angle) * (innerR + barHeight);
        const y2 = h / 2 + Math.sin(angle) * (innerR + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isListening]);

  return (
    <div className="recording-panel">
      <div className="recording-visual">
        <canvas ref={canvasRef} className="recording-canvas" style={{ display: isListening ? 'block' : 'none' }} />

        <button
          id="record-toggle-btn"
          className={`mic-button ${isListening ? 'mic-button--active' : ''}`}
          onClick={isListening ? onStop : onStart}
          disabled={!isSupported}
          title={isListening ? 'Stop recording (S)' : 'Start recording (R)'}
        >
          {isListening ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>
      </div>

      <div className="recording-status">
        <span className={`status-dot ${isListening ? 'status-dot--active' : ''}`} />
        <span className="status-text">
          {!isSupported ? 'Not supported' : isListening ? 'Listening...' : 'Ready'}
        </span>
      </div>

      {interimText && (
        <div className="interim-text">
          <span className="interim-label">Hearing:</span>
          <span className="interim-content">{interimText}</span>
        </div>
      )}

      {error && (
        <div className="recording-error">{error}</div>
      )}
    </div>
  );
}
