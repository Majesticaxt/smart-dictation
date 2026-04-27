/**
 * Punctuation command processing.
 * Converts spoken words like "comma" into actual punctuation marks.
 */

// Default punctuation map — spoken word → symbol
const DEFAULT_PUNCTUATION_MAP = {
  'comma': ',',
  'full stop': '.',
  'period': '.',
  'question mark': '?',
  'exclamation mark': '!',
  'exclamation point': '!',
  'new line': '\n',
  'next line': '\n',
  'new paragraph': '\n\n',
  'colon': ':',
  'semicolon': ';',
  'semi colon': ';',
  'hyphen': '-',
  'dash': ' — ',
  'open quote': '"',
  'close quote': '"',
  'open bracket': '(',
  'close bracket': ')',
  'apostrophe': "'",
};

// Punctuation marks that should have no space before them
const NO_SPACE_BEFORE = new Set([',', '.', '?', '!', ':', ';', "'", '"', ')']);

// Punctuation marks that start a new sentence (capitalize next word)
const SENTENCE_ENDERS = new Set(['.', '?', '!']);

/**
 * Process spoken punctuation commands in a transcript.
 * @param {string} text - Raw transcript text
 * @param {Object} customMap - User's custom punctuation aliases
 * @returns {string} Text with punctuation commands replaced by symbols
 */
export function processPunctuation(text, customMap = {}) {
  const fullMap = { ...DEFAULT_PUNCTUATION_MAP, ...customMap };

  // Sort keys by length (longest first) so "full stop" matches before "full"
  const sortedKeys = Object.keys(fullMap).sort((a, b) => b.length - a.length);

  let result = text;

  for (const key of sortedKeys) {
    // Match the spoken command with word boundaries (case-insensitive)
    const regex = new RegExp(`\\b${escapeRegex(key)}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      const symbol = fullMap[key];
      return `{{PUNCT:${symbol}}}`;
    });
  }

  // Now replace the placeholders with actual punctuation + proper spacing
  result = result.replace(/\s*\{\{PUNCT:(.+?)\}\}\s*/g, (match, symbol) => {
    if (symbol === '\n' || symbol === '\n\n') {
      return symbol;
    }
    if (NO_SPACE_BEFORE.has(symbol)) {
      return symbol + ' ';
    }
    return ' ' + symbol + ' ';
  });

  return result;
}

/**
 * Auto-capitalize first letter after sentence-ending punctuation and at start of text.
 * @param {string} text
 * @returns {string}
 */
export function autoCapitalize(text) {
  if (!text) return text;

  // Capitalize first character
  let result = text.charAt(0).toUpperCase() + text.slice(1);

  // Capitalize after sentence enders followed by space
  result = result.replace(/([.?!]\s+)(\w)/g, (match, punct, letter) => {
    return punct + letter.toUpperCase();
  });

  // Capitalize after newlines
  result = result.replace(/(\n\s*)(\w)/g, (match, newline, letter) => {
    return newline + letter.toUpperCase();
  });

  return result;
}

/**
 * Clean up spacing around punctuation.
 * @param {string} text
 * @returns {string}
 */
export function cleanSpacing(text) {
  if (!text) return text;

  let result = text;

  // Remove space before punctuation that shouldn't have it
  result = result.replace(/\s+([,.\?!:;])/g, '$1');

  // Ensure space after punctuation (except at end of string or before newline)
  result = result.replace(/([,.\?!:;])(\w)/g, '$1 $2');

  // Remove multiple spaces
  result = result.replace(/ {2,}/g, ' ');

  // Trim lines
  result = result.split('\n').map(line => line.trim()).join('\n');

  return result;
}

/**
 * Full punctuation pipeline: process commands → capitalize → clean spacing.
 */
export function fullPunctuationPipeline(text, customMap = {}) {
  let result = processPunctuation(text, customMap);
  result = autoCapitalize(result);
  result = cleanSpacing(result);
  return result;
}

/** Escape special regex characters in a string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { DEFAULT_PUNCTUATION_MAP };
