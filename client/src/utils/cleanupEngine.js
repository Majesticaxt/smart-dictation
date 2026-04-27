/**
 * Local rule-based text cleanup engine.
 * Used as offline fallback when Groq API is unavailable.
 */

// Default filler words to remove
const DEFAULT_FILLER_WORDS = [
  'um', 'uh', 'uhh', 'umm', 'erm',
  'like', 'you know', 'i mean',
  'basically', 'literally', 'actually',
  'sort of', 'kind of', 'right',
  'so yeah', 'yeah so', 'well',
];

/**
 * Clean text using local rules + user profile.
 * @param {string} text - Text to clean
 * @param {Object} profile - User's personal profile
 * @returns {{ cleanedText: string, changes: Array }}
 */
export function cleanTextLocally(text, profile = {}) {
  const changes = [];
  let result = text;

  // 1. Remove filler words
  const fillerWords = [
    ...DEFAULT_FILLER_WORDS,
    ...(profile.fillerWords || []),
  ];
  for (const filler of fillerWords) {
    const regex = new RegExp(`\\b${escapeRegex(filler)}\\b[,]?\\s*`, 'gi');
    const before = result;
    result = result.replace(regex, '');
    if (result !== before) {
      changes.push({ type: 'filler', original: filler, replacement: '' });
    }
  }

  // 2. Apply user's custom corrections
  const corrections = profile.corrections || {};
  for (const [wrong, right] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${escapeRegex(wrong)}\\b`, 'gi');
    const before = result;
    result = result.replace(regex, right);
    if (result !== before) {
      changes.push({ type: 'correction', original: wrong, replacement: right });
    }
  }

  // 3. Remove duplicate adjacent words ("I I went" → "I went")
  const beforeDup = result;
  result = result.replace(/\b(\w+)\s+\1\b/gi, '$1');
  if (result !== beforeDup) {
    changes.push({ type: 'duplicate', original: 'duplicate words', replacement: 'removed' });
  }

  // 4. Fix capitalization
  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/([.?!]\s+)(\w)/g, (m, p, l) => p + l.toUpperCase());

  // 5. Fix spacing
  result = result.replace(/\s+([,.\?!:;])/g, '$1');
  result = result.replace(/([,.\?!:;])(\w)/g, '$1 $2');
  result = result.replace(/ {2,}/g, ' ');
  result = result.trim();

  // 6. Ensure ends with period if no ending punctuation
  if (result && !/[.?!]$/.test(result)) {
    result += '.';
    changes.push({ type: 'punctuation', original: '', replacement: 'Added ending period' });
  }

  return { cleanedText: result, changes };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { DEFAULT_FILLER_WORDS };
