/**
 * Profile storage — localStorage wrapper for personal speech profile.
 */

const STORAGE_KEY = 'smart-dictation-profile';

/**
 * Default profile structure.
 */
const DEFAULT_PROFILE = {
  // Custom word corrections: { "gonna": "going to", "wanna": "want to" }
  corrections: {},

  // Custom filler words to remove (on top of defaults)
  fillerWords: [],

  // Protected vocabulary — words the cleanup engine should NOT alter
  vocabulary: [],

  // Custom punctuation aliases: { "dot": ".", "stop": "." }
  punctuationAliases: {},

  // Stats
  stats: {
    totalDictations: 0,
    totalCleanups: 0,
    totalCorrectionsLearned: 0,
    wordsTranscribed: 0,
  },

  // TTS preferences
  ttsSettings: {
    voiceName: '',
    rate: 1,
    pitch: 1,
  },
};

/**
 * Load profile from localStorage.
 * @returns {Object} The user profile
 */
export function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields exist
      return deepMerge(DEFAULT_PROFILE, parsed);
    }
  } catch (err) {
    console.warn('Failed to load profile:', err);
  }
  return { ...DEFAULT_PROFILE };
}

/**
 * Save profile to localStorage.
 * @param {Object} profile
 */
export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile:', err);
  }
}

/**
 * Export profile as a downloadable JSON file.
 * @param {Object} profile
 */
export function exportProfile(profile) {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart-dictation-profile.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import profile from a JSON file.
 * @param {File} file
 * @returns {Promise<Object>}
 */
export function importProfile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const merged = deepMerge(DEFAULT_PROFILE, parsed);
        saveProfile(merged);
        resolve(merged);
      } catch (err) {
        reject(new Error('Invalid profile file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Reset profile to defaults.
 */
export function resetProfile() {
  saveProfile(DEFAULT_PROFILE);
  return { ...DEFAULT_PROFILE };
}

/** Deep merge two objects */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export { DEFAULT_PROFILE };
