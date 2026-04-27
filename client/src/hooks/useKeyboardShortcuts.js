import { useEffect, useCallback } from 'react';

/**
 * Custom hook for global keyboard shortcuts.
 * Shortcuts are disabled when a textarea or input is focused.
 *
 * @param {Object} handlers - Map of shortcut key to handler function
 *   e.g. { r: startRecording, s: stopRecording, Enter: cleanText, ' ': playAudio }
 */
export function useKeyboardShortcuts(handlers) {
  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    const tag = event.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return;
    }

    // Don't trigger with modifier keys (let browser shortcuts work)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const key = event.key;
    const handler = handlers[key] || handlers[key.toLowerCase()];

    if (handler) {
      event.preventDefault();
      handler();
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
