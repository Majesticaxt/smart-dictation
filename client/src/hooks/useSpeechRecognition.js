import { useState, useRef, useCallback, useEffect } from 'react';
import { fullPunctuationPipeline } from '../utils/punctuation';

/**
 * Voice correction commands — spoken phrases that modify existing text
 * instead of adding new text.
 */
const VOICE_COMMANDS = {
  // Delete the last sentence or phrase
  'scratch that': { action: 'DELETE_LAST_SENTENCE' },
  'delete that': { action: 'DELETE_LAST_SENTENCE' },
  'remove that': { action: 'DELETE_LAST_SENTENCE' },

  // Delete just the last word
  'delete last word': { action: 'DELETE_LAST_WORD' },
  'remove last word': { action: 'DELETE_LAST_WORD' },
  'backspace': { action: 'DELETE_LAST_WORD' },

  // Delete last few words
  'undo': { action: 'DELETE_LAST_CHUNK' },
  'undo that': { action: 'DELETE_LAST_CHUNK' },
  'go back': { action: 'DELETE_LAST_CHUNK' },

  // Clear everything
  'clear all': { action: 'CLEAR_ALL' },
  'clear everything': { action: 'CLEAR_ALL' },
  'start over': { action: 'CLEAR_ALL' },

  // Replace last word
  'correction': { action: 'REPLACE_MODE' },
  'replace that with': { action: 'REPLACE_MODE' },
};

/**
 * Check if a transcript contains a voice command.
 * Returns { action, remaining } or null.
 */
function detectVoiceCommand(transcript) {
  const lower = transcript.trim().toLowerCase();

  // Sort by length (longest match first)
  const commands = Object.keys(VOICE_COMMANDS).sort((a, b) => b.length - a.length);

  for (const cmd of commands) {
    if (lower === cmd || lower.startsWith(cmd + ' ') || lower.endsWith(' ' + cmd)) {
      const remaining = lower.replace(cmd, '').trim();
      return { ...VOICE_COMMANDS[cmd], remaining };
    }
  }

  return null;
}

/**
 * Custom hook for Web Speech API speech recognition.
 * Handles browser compatibility, continuous listening, punctuation processing,
 * and voice correction commands.
 */
export function useSpeechRecognition(customPunctuationMap = {}) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);
  const onResultCallbackRef = useRef(null);
  const onCommandCallbackRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const recentTranscriptsRef = useRef(new Map());

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  /**
   * Set the callback for when final text results come in.
   * @param {Function} callback - Receives the processed final text
   */
  const setOnResult = useCallback((callback) => {
    onResultCallbackRef.current = callback;
  }, []);

  /**
   * Set the callback for when a voice command is detected.
   * @param {Function} callback - Receives { action, remaining }
   */
  const setOnCommand = useCallback((callback) => {
    onCommandCallbackRef.current = callback;
  }, []);

  /**
   * Create and start a FRESH recognition instance.
   * Key fix: never reuse the old instance on Android — it replays old results.
   */
  const startNewInstance = useCallback(() => {
    if (!shouldBeListeningRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (finalTranscript) {
        const trimmed = finalTranscript.trim();
        if (!trimmed) return;

        // ── Deduplication: skip if seen this EXACT text within 4 seconds ──
        const now = Date.now();
        const key = trimmed.toLowerCase().replace(/\s+/g, ' ');

        const lastSeen = recentTranscriptsRef.current.get(key);
        if (lastSeen && now - lastSeen < 4000) return; // exact duplicate — skip

        recentTranscriptsRef.current.set(key, now);

        // Clean old entries
        for (const [k, t] of recentTranscriptsRef.current.entries()) {
          if (now - t > 5000) recentTranscriptsRef.current.delete(k);
        }

        // Check for voice commands
        const command = detectVoiceCommand(trimmed);
        if (command) {
          if (onCommandCallbackRef.current) onCommandCallbackRef.current(command);
        } else {
          const processed = fullPunctuationPipeline(trimmed, customPunctuationMap);
          if (onResultCallbackRef.current) onResultCallbackRef.current(processed);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      // ── Key fix: spawn a FRESH instance, never restart the same one ──
      if (shouldBeListeningRef.current) {
        setTimeout(() => startNewInstance(), 150);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError('Failed to start speech recognition. Is microphone access allowed?');
      setIsListening(false);
    }
  }, [customPunctuationMap]);

  /**
   * Start listening.
   */
  const start = useCallback(() => {
    if (!isSupported) return;
    shouldBeListeningRef.current = true;
    recentTranscriptsRef.current.clear();
    startNewInstance();
  }, [isSupported, startNewInstance]);

  /**
   * Stop listening.
   */
  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch (e) { /* ignore */ }
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  return {
    isListening,
    interimText,
    error,
    isSupported,
    start,
    stop,
    setOnResult,
    setOnCommand,
  };
}
