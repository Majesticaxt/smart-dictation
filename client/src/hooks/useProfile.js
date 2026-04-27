import { useState, useCallback, useEffect } from 'react';
import { loadProfile, saveProfile, exportProfile, importProfile, resetProfile } from '../utils/storage';

/**
 * Custom hook for managing the user's personal speech profile.
 * Handles CRUD for corrections, filler words, vocabulary, and settings.
 */
export function useProfile() {
  const [profile, setProfile] = useState(() => loadProfile());

  // Auto-save whenever profile changes
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  /** Add a word correction */
  const addCorrection = useCallback((original, corrected) => {
    setProfile(prev => ({
      ...prev,
      corrections: { ...prev.corrections, [original.toLowerCase()]: corrected },
      stats: { ...prev.stats, totalCorrectionsLearned: prev.stats.totalCorrectionsLearned + 1 },
    }));
  }, []);

  /** Remove a word correction */
  const removeCorrection = useCallback((original) => {
    setProfile(prev => {
      const corrections = { ...prev.corrections };
      delete corrections[original];
      return { ...prev, corrections };
    });
  }, []);

  /** Add a filler word */
  const addFillerWord = useCallback((word) => {
    setProfile(prev => ({
      ...prev,
      fillerWords: [...new Set([...prev.fillerWords, word.toLowerCase()])],
    }));
  }, []);

  /** Remove a filler word */
  const removeFillerWord = useCallback((word) => {
    setProfile(prev => ({
      ...prev,
      fillerWords: prev.fillerWords.filter(w => w !== word),
    }));
  }, []);

  /** Add a vocabulary word (protected from cleanup) */
  const addVocabulary = useCallback((word) => {
    setProfile(prev => ({
      ...prev,
      vocabulary: [...new Set([...prev.vocabulary, word])],
    }));
  }, []);

  /** Remove a vocabulary word */
  const removeVocabulary = useCallback((word) => {
    setProfile(prev => ({
      ...prev,
      vocabulary: prev.vocabulary.filter(w => w !== word),
    }));
  }, []);

  /** Add a custom punctuation alias */
  const addPunctuationAlias = useCallback((spoken, symbol) => {
    setProfile(prev => ({
      ...prev,
      punctuationAliases: { ...prev.punctuationAliases, [spoken.toLowerCase()]: symbol },
    }));
  }, []);

  /** Remove a punctuation alias */
  const removePunctuationAlias = useCallback((spoken) => {
    setProfile(prev => {
      const aliases = { ...prev.punctuationAliases };
      delete aliases[spoken];
      return { ...prev, punctuationAliases: aliases };
    });
  }, []);

  /** Update TTS settings */
  const updateTTSSettings = useCallback((settings) => {
    setProfile(prev => ({
      ...prev,
      ttsSettings: { ...prev.ttsSettings, ...settings },
    }));
  }, []);

  /** Increment a stat counter */
  const incrementStat = useCallback((stat, amount = 1) => {
    setProfile(prev => ({
      ...prev,
      stats: { ...prev.stats, [stat]: (prev.stats[stat] || 0) + amount },
    }));
  }, []);

  /** Export profile to JSON file */
  const handleExport = useCallback(() => {
    exportProfile(profile);
  }, [profile]);

  /** Import profile from JSON file */
  const handleImport = useCallback(async (file) => {
    const imported = await importProfile(file);
    setProfile(imported);
  }, []);

  /** Reset to defaults */
  const handleReset = useCallback(() => {
    const fresh = resetProfile();
    setProfile(fresh);
  }, []);

  return {
    profile,
    addCorrection,
    removeCorrection,
    addFillerWord,
    removeFillerWord,
    addVocabulary,
    removeVocabulary,
    addPunctuationAlias,
    removePunctuationAlias,
    updateTTSSettings,
    incrementStat,
    handleExport,
    handleImport,
    handleReset,
  };
}
