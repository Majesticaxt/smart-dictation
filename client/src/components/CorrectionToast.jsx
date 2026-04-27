import { useState, useEffect } from 'react';

/**
 * CorrectionToast — Shows when user edits text, offering to learn the correction.
 */
export default function CorrectionToast({ corrections, onSave, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (corrections && corrections.length > 0) {
      setVisible(true);
    }
  }, [corrections]);

  if (!visible || !corrections || corrections.length === 0) return null;

  const handleSave = (correction) => {
    onSave(correction);
    const remaining = corrections.filter(c => c !== correction);
    if (remaining.length === 0) setVisible(false);
  };

  const handleDismissAll = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="correction-toast">
      <div className="toast-header">
        <span className="toast-icon">🧠</span>
        <span className="toast-title">Learn {corrections.length === 1 ? 'this correction' : 'these corrections'}?</span>
        <button className="toast-close" onClick={handleDismissAll}>✕</button>
      </div>
      <div className="toast-corrections">
        {corrections.slice(0, 3).map((c, i) => (
          <div key={i} className="toast-correction-item">
            <span className="correction-from">"{c.original}"</span>
            <span className="correction-arrow">→</span>
            <span className="correction-to">"{c.corrected}"</span>
            <button className="correction-save-btn" onClick={() => handleSave(c)}>Save</button>
          </div>
        ))}
      </div>
    </div>
  );
}
