import { useState, useRef, useCallback, useEffect } from 'react';
import { fullPunctuationPipeline } from '../utils/punctuation';

/**
 * Voice correction commands — spoken phrases that modify existing text
 * instead of adding new text.
 */
const VOICE_COMMANDS = {
  'scratch that': { action: 'DELETE_LAST_SENTENCE' },
  'delete that': { action: 'DELETE_LAST_SENTENCE' },
  'remove that': { action: 'DELETE_LAST_SENTENCE' },
  'delete last word': { action: 'DELETE_LAST_WORD' },
  'remove last word': { action: 'DELETE_LAST_WORD' },
  'backspace': { action: 'DELETE_LAST_WORD' },
  'undo': { action: 'DELETE_LAST_CHUNK' },
  'undo that': { action: 'DELETE_LAST_CHUNK' },
  'go back': { action: 'DELETE_LAST_CHUNK' },
  'clear all': { action: 'CLEAR_ALL' },
  'clear everything': { action: 'CLEAR_ALL' },
  'start over': { action: 'CLEAR_ALL' },
  'correction': { action: 'REPLACE_MODE' },
  'replace that with': { action: 'REPLACE_MODE' },
};

function detectVoiceCommand(transcript) {
  const lower = transcript.trim().toLowerCase();
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
 * Detect if running on Android
 */
function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

/**
 * Custom hook for Web Speech API speech recognition.
 * Handles browser compatibility, continuous listening, punctuation processing,
 * and voice correction commands.
 *
 * KEY FIX for Android: Android Chrome sends progressive final results for
 * the same utterance ("Good" → "Good afternoon" → "Good afternoon sir").
 * We detect these extensions and REPLACE the last result instead of appending.
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

  // Android progressive result tracking
  const lastFinalRef = useRef('');        // Last final text we emitted
  const lastFinalTimeRef = useRef(0);     // When it was emitted
  const onReplaceCallbackRef = useRef(null);  // Replace callback for extensions

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    }
  }, []);

  const setOnResult = useCallback((callback) => {
    onResultCallbackRef.current = callback;
  }, []);

  const setOnCommand = useCallback((callback) => {
    onCommandCallbackRef.current = callback;
  }, []);

  /**
   * Set the callback for when text should be REPLACED (Android extension detection).
   * @param {Function} callback - Receives (oldText, newText)
   */
  const setOnReplace = useCallback((callback) => {
    onReplaceCallbackRef.current = callback;
  }, []);

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

        const now = Date.now();
        const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
        const lastKey = lastFinalRef.current.toLowerCase().replace(/\s+/g, ' ');
        const timeSinceLast = now - lastFinalTimeRef.current;

        // ── Android progressive result detection ──
        // If the new result starts with or contains the last result,
        // it's an extension of the same utterance → REPLACE
        if (lastKey && timeSinceLast < 5000 && key.startsWith(lastKey) && key !== lastKey) {
          // This is an extension: "Good" → "Good afternoon"
          const oldProcessed = fullPunctuationPipeline(lastFinalRef.current.trim(), customPunctuationMap);
          const newProcessed = fullPunctuationPipeline(trimmed, customPunctuationMap);

          lastFinalRef.current = trimmed;
          lastFinalTimeRef.current = now;

          if (onReplaceCallbackRef.current) {
            onReplaceCallbackRef.current(oldProcessed, newProcessed);
          }
          return;
        }

        // ── Exact duplicate check ──
        if (key === lastKey && timeSinceLast < 4000) return;

        // ── New utterance ──
        lastFinalRef.current = trimmed;
        lastFinalTimeRef.current = now;

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

  const start = useCallback(() => {
    if (!isSupported) return;
    shouldBeListeningRef.current = true;
    lastFinalRef.current = '';
    lastFinalTimeRef.current = 0;
    startNewInstance();
  }, [isSupported, startNewInstance]);

  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      const ref = recognitionRef.current;
      recognitionRef.current = null;
      try { ref.stop(); } catch (e) { /* ignore */ }
    }
    setIsListening(false);
    setInterimText('');
    lastFinalRef.current = '';
    lastFinalTimeRef.current = 0;
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
    setOnReplace,
  };
}
