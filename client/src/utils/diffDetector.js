/**
 * Diff detector — compares original vs edited text to find user corrections.
 * Used to power the "learn this correction?" feature.
 */

/**
 * Detect word-level corrections between original and edited text.
 * @param {string} original - Text before user editing
 * @param {string} edited - Text after user editing
 * @returns {Array<{ original: string, corrected: string }>}
 */
export function detectCorrections(original, edited) {
  if (!original || !edited) return [];
  if (original === edited) return [];

  const origWords = tokenize(original);
  const editWords = tokenize(edited);

  const corrections = [];

  // Use a simple longest common subsequence approach
  // to find changed segments
  const lcs = longestCommonSubsequence(origWords, editWords);

  let oi = 0, ei = 0, li = 0;

  while (oi < origWords.length || ei < editWords.length) {
    if (li < lcs.length && oi < origWords.length && origWords[oi] === lcs[li] &&
        ei < editWords.length && editWords[ei] === lcs[li]) {
      // Both match the LCS — skip
      oi++;
      ei++;
      li++;
    } else {
      // Collect the differing segment
      let origSegment = [];
      let editSegment = [];

      while (oi < origWords.length && (li >= lcs.length || origWords[oi] !== lcs[li])) {
        origSegment.push(origWords[oi]);
        oi++;
      }
      while (ei < editWords.length && (li >= lcs.length || editWords[ei] !== lcs[li])) {
        editSegment.push(editWords[ei]);
        ei++;
      }

      if (origSegment.length > 0 && editSegment.length > 0) {
        const origPhrase = origSegment.join(' ').toLowerCase();
        const editPhrase = editSegment.join(' ').toLowerCase();

        // Only suggest saving if the correction is meaningful
        if (origPhrase !== editPhrase && origPhrase.length > 1 && editPhrase.length > 1) {
          corrections.push({
            original: origPhrase,
            corrected: editPhrase,
          });
        }
      }
    }
  }

  return corrections;
}

/**
 * Tokenize text into words, preserving punctuation.
 */
function tokenize(text) {
  return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * Compute longest common subsequence of two word arrays.
 */
function longestCommonSubsequence(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the actual LCS
  const lcs = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
