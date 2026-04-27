import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Browser SpeechSynthesis API.
 * Provides voice listing, selection, and playback controls.
 */
export function useSpeechSynthesis() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  const utteranceRef = useRef(null);

  // Load available voices
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const loadVoices = () => {
      const available = synth.getVoices();
      // Prioritize English voices
      const sorted = available.sort((a, b) => {
        const aEn = a.lang.startsWith('en') ? 0 : 1;
        const bEn = b.lang.startsWith('en') ? 0 : 1;
        return aEn - bEn;
      });
      setVoices(sorted);

      // Auto-select first English voice
      if (!selectedVoice && sorted.length > 0) {
        const englishVoice = sorted.find(v => v.lang.startsWith('en')) || sorted[0];
        setSelectedVoice(englishVoice);
      }
    };

    loadVoices();

    // Chrome loads voices async
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, []);

  /**
   * Speak the given text.
   * @param {string} text
   */
  const speak = useCallback((text) => {
    const synth = window.speechSynthesis;
    if (!synth || !text) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    synth.speak(utterance);
  }, [selectedVoice, rate, pitch]);

  /**
   * Stop speaking.
   */
  const stopSpeaking = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Set voice by name.
   */
  const setVoiceByName = useCallback((name) => {
    const voice = voices.find(v => v.name === name);
    if (voice) setSelectedVoice(voice);
  }, [voices]);

  return {
    voices,
    selectedVoice,
    isSpeaking,
    rate,
    pitch,
    speak,
    stopSpeaking,
    setVoiceByName,
    setSelectedVoice,
    setRate,
    setPitch,
  };
}
