/**
 * TextEditor — Editable textarea for transcribed/cleaned text.
 */
export default function TextEditor({ text, setText, previousText, onTextEdited }) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const handleChange = (e) => {
    setText(e.target.value);
  };

  // When user finishes editing (on blur), detect corrections
  const handleBlur = () => {
    if (previousText && text !== previousText && onTextEdited) {
      onTextEdited(previousText, text);
    }
  };

  return (
    <div className="text-editor">
      <div className="text-editor__header">
        <h2 className="text-editor__title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
          Text Editor
        </h2>
        <div className="text-editor__stats">
          <span>{wordCount} words</span>
          <span className="stat-divider">•</span>
          <span>{charCount} chars</span>
        </div>
      </div>

      <textarea
        id="main-textarea"
        className="text-editor__textarea"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Start recording or type here...&#10;&#10;💡 Say &quot;comma&quot;, &quot;full stop&quot;, &quot;question mark&quot; etc. while speaking to add punctuation automatically."
        spellCheck={true}
      />
    </div>
  );
}
